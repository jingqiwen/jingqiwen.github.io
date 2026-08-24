/* =====================================================================
 *  three-bg.js —— 全站固定“夜空 · 星光点点”背景
 * =====================================================================
 *  【功能】
 *   1. 优先使用 Three.js（CDN 引入）绘制星光点点的夜空；
 *   2. Three.js 加载失败时自动降级为 2D Canvas 星空；
 *   3. 星空层固定在视口上，首页、关于我、技能、项目等所有版块共用；
 *   4. 鼠标静止时：星星自己缓慢漂移、旋转、闪烁；
 *      鼠标（地球光标）移动时：整片星空平滑跟随鼠标视角变化；
 *   5. 暗色主题星星更多、更亮；移动端自动减少星星数量。
 * =====================================================================
 */
(function () {
  "use strict";

  // 全局暴露一个对象，main.js 切换主题时会调用 heroBackground.setTheme()
  window.heroBackground = null;

  // 鼠标坐标（main.js 的地球光标会不断更新它）
  // x / y 范围：-1 ~ 1；active = 鼠标是否在页面里
  window.heroMouse = window.heroMouse || { x: 0, y: 0, active: false };

  // 全站星空层：固定在视口最底层，滚动页面时也不会移动
  const container = document.getElementById("star-field");
  if (!container) return; // 找不到背景容器就直接退出

  // 是否减少动态效果（尊重系统无障碍设置）
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 判断设备：窄屏（手机/平板竖屏）减少星星数量
  const isMobile = window.innerWidth < 768;

  // 当前是否为暗色主题（默认暗色，打开即星空）
  function isDarkTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  /* ------------------------------------------------------------------
   * 小工具：把 CSS 中的颜色字符串（如 #7fd8ff）转成 THREE.Color
   * ------------------------------------------------------------------ */
  function getThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      normal: styles.getPropertyValue("--star-color").trim() || "#7fd8ff",
      bright: styles.getPropertyValue("--star-color-bright").trim() || "#ffffff"
    };
  }

  /* ==================================================================
   * 方案一：Three.js 3D 星空（鼠标追踪视角）
   * ================================================================== */
  function createThreeBackground() {
    let renderer, scene, camera, group, stars, brightStars, rafId = 0;
    let normalColor, brightColor, running = true;
    let rotX = 0, rotY = 0; // 平滑旋转角度（每次动画慢慢逼近目标）

    // --- 1. 创建渲染器（开启透明，让 CSS 夜空渐变透出来） ---
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // 最高 2 倍，防止手机过热
    renderer.setClearColor(0x000000, 0); // 全透明背景
    container.appendChild(renderer.domElement);

    // --- 2. 相机：透视相机，观察星云中心 ---
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, 1, 1, 2000);
    camera.position.z = 620;

    group = new THREE.Group();
    scene.add(group);

    // --- 3. 生成柔和的圆形光点纹理（径向渐变，边缘透明） ---
    function makeStarTexture() {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.35, "rgba(255,255,255,0.85)");
      gradient.addColorStop(0.7, "rgba(255,255,255,0.18)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    // --- 4. 随机生成一批星星的位置 ---
    function makePositions(count) {
      const positions = new Float32Array(count * 3);
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * w * 1.3;          // X：左右铺满并略超出
        positions[i * 3 + 1] = (Math.random() - 0.5) * h * 1.25;     // Y
        positions[i * 3 + 2] = (Math.random() - 0.5) * 340;          // Z：前后错落，形成景深
      }
      return positions;
    }

    function makePoints(count, size, color, opacity) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(makePositions(count), 3));
      const material = new THREE.PointsMaterial({
        size: size,
        map: makeStarTexture(),
        color: color,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending, // 叠加混合，星星发光更柔和
        sizeAttenuation: true
      });
      const points = new THREE.Points(geometry, material);
      // 给每颗星保存一个随机“闪烁相位”，用于后续呼吸动画
      points.userData.phase = Math.random() * Math.PI * 2;
      return points;
    }

    function rebuildStars() {
      // 先清掉旧的星点
      while (group.children.length) {
        const child = group.children.pop();
        child.geometry && child.geometry.dispose();
        child.material && child.material.map && child.material.map.dispose();
        child.material && child.material.dispose();
      }
      const colors = getThemeColors();
      normalColor = new THREE.Color(colors.normal);
      brightColor = new THREE.Color(colors.bright);
      const dark = isDarkTheme();

      // 暗色主题：星星数量更多、更大、更亮，形成“星光点点”的夜空
      const normalCount = dark ? (isMobile ? 190 : 320) : (isMobile ? 140 : 240);
      const brightCount = dark ? (isMobile ? 45 : 100) : (isMobile ? 35 : 70);
      const normalSize = dark ? (isMobile ? 3.8 : 3.4) : (isMobile ? 3.2 : 3.0);
      const brightSize = dark ? (isMobile ? 5.8 : 5.2) : (isMobile ? 5.2 : 4.6);

      stars = makePoints(normalCount, normalSize, normalColor, dark ? 0.95 : 0.85);
      brightStars = makePoints(brightCount, brightSize, brightColor, dark ? 0.9 : 0.8);
      group.add(stars);
      group.add(brightStars);
    }

    rebuildStars();

    // --- 5. 窗口大小变化时重新调整画布 ---
    function resize() {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rebuildStars(); // 重新生成位置，让星星始终铺满首屏
    }

    window.addEventListener("resize", resize);

    // --- 6. 动画循环：呼吸闪烁 + 鼠标追踪视角 ---
    const startTime = performance.now();

    function animate(now) {
      if (!running) return;
      rafId = requestAnimationFrame(animate);

      const t = (now - startTime) / 1000;
      const mouse = window.heroMouse || { x: 0, y: 0, active: false };

      // 视角目标：鼠标在右边 -> 星云向右转；鼠标在下边 -> 星云向上仰，
      // 再叠加一点点自动的缓慢摆动，像在宇宙里慢慢漂移。
      const baseSway = Math.sin(t * 0.06) * 0.10;
      const targetRotX = mouse.active ? mouse.y * 0.18 : 0;
      const targetRotY = baseSway + (mouse.active ? mouse.x * 0.24 : 0);

      // 平滑插值，避免星云“啪”地跳过去
      rotX += (targetRotX - rotX) * 0.045;
      rotY += (targetRotY - rotY) * 0.045;
      group.rotation.x = rotX;
      group.rotation.y = rotY;

      // 相机也跟随鼠标轻微平移，增强“星空围绕地球鼠标”的沉浸感
      const camTargetX = (mouse.active ? mouse.x : 0) * 46;
      const camTargetY = (mouse.active ? -mouse.y : 0) * 28;
      camera.position.x += (camTargetX - camera.position.x) * 0.04;
      camera.position.y += (camTargetY - camera.position.y) * 0.04;
      camera.lookAt(scene.position);

      // 两层星星以相反节奏“呼吸”，亮度此起彼伏
      if (stars && brightStars) {
        const dark = isDarkTheme();
        stars.material.opacity = (dark ? 0.75 : 0.55) + 0.25 * Math.sin(t * 0.7 + stars.userData.phase);
        brightStars.material.opacity = (dark ? 0.7 : 0.45) + 0.35 * Math.sin(t * 0.9 + Math.PI + brightStars.userData.phase);
      }

      renderer.render(scene, camera);
    }

    // 静态模式：只画一帧就停住
    if (reduceMotion) {
      renderer.render(scene, camera);
    } else {
      rafId = requestAnimationFrame(animate);
    }

    // --- 7. 对外接口 ---
    return {
      // 主题切换时调用：根据明暗主题重建星空的颜色、数量与亮度
      setTheme() {
        rebuildStars();
        if (reduceMotion) renderer.render(scene, camera);
      },
      // 页面卸载时清理资源
      destroy() {
        running = false;
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", resize);
        renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }

  /* ==================================================================
   * 方案二：2D Canvas 星空降级方案（Three.js 加载失败时使用）
   *        同样支持鼠标视差：近处的星星移动多，远处的移动少
   * ================================================================== */
  function createCanvasFallback() {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.zIndex = "1";
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    let stars = [];
    let rafId = 0;
    let running = true;
    let w = 0;
    let h = 0;
    let dpr = 1;

    function makeStars() {
      const colors = getThemeColors();
      const dark = isDarkTheme();
      const count = dark ? (isMobile ? 120 : 220) : (isMobile ? 90 : 170);
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: (dark ? 0.5 : 0.4) + Math.random() * (dark ? 1.8 : 1.5), // 暗色主题星点更大
          baseAlpha: (dark ? 0.32 : 0.25) + Math.random() * 0.5,
          speed: 0.03 + Math.random() * 0.12,     // 下落速度
          phase: Math.random() * Math.PI * 2,     // 闪烁相位
          depth: 0.35 + Math.random() * 0.65,     // 视差深度：近大远小
          bright: Math.random() > 0.8,
          color: colors[Math.random() > 0.85 ? "bright" : "normal"]
        });
      }
    }

    function resize() {
      w = container.clientWidth || window.innerWidth;
      h = container.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeStars();
    }

    function draw(t) {
      if (!running) return;
      if (!reduceMotion) rafId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, w, h);

      const colors = getThemeColors();
      const mouse = window.heroMouse || { x: 0, y: 0, active: false };
      // 鼠标移动时，整片星空向反方向轻微偏移，产生视差
      const offsetX = mouse.active ? mouse.x * 52 : 0;
      const offsetY = mouse.active ? mouse.y * 34 : 0;

      for (const star of stars) {
        // 基础位置：慢慢向下飘；鼠标视差：近处星星位移更大
        if (!reduceMotion) {
          star.y += star.speed;
          if (star.y > h + 6) { star.y = -6; star.x = Math.random() * w; }
        }

        let drawX = star.x - offsetX * star.depth;
        let drawY = star.y - offsetY * star.depth;

        // 移出边界后从另一侧回来，保证任何鼠标位置都有星星
        if (drawX > w + 8) drawX -= w + 16;
        if (drawX < -8) drawX += w + 16;
        if (drawY > h + 8) drawY -= h + 16;
        if (drawY < -8) drawY += h + 16;

        // 柔和闪烁
        const twinkle = reduceMotion ? 0 : 0.3 * Math.sin(t * 0.0012 + star.phase);
        const alpha = Math.max(0.08, Math.min(1, star.baseAlpha + twinkle));
        const color = star.color === "bright" ? colors.bright : colors.normal;

        // 外圈光晕 + 白色内核
        const glow = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, star.r * 4);
        glow.addColorStop(0, color);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = alpha * (star.bright ? 0.95 : 0.65);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(drawX, drawY, star.r * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(drawX, drawY, star.r * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      draw(0);
    } else {
      rafId = requestAnimationFrame(draw);
    }

    return {
      setTheme() {
        makeStars(); // 主题变化后重新随机配色与数量
        if (reduceMotion) draw(0); // 静态模式下也要重画一帧
      },
      destroy() {
        running = false;
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", resize);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  /* ==================================================================
   * 入口：优先 Three.js，失败则 2D 降级
   * ================================================================== */
  try {
    if (window.THREE) {
      window.heroBackground = createThreeBackground();
    } else {
      window.heroBackground = createCanvasFallback();
    }
  } catch (error) {
    // Three.js 初始化出错（比如浏览器不支持 WebGL）时，也走 2D 方案
    console.warn("Three.js 星空初始化失败，已降级为 2D 星空。", error);
    try {
      window.heroBackground = createCanvasFallback();
    } catch (error2) {
      console.warn("2D 星空也未能启动：", error2);
    }
  }
})();
