/* =====================================================================
 *  three-bg.js —— 首屏“天空 · 柔和星点”粒子背景
 * =====================================================================
 *  【功能】
 *   1. 优先使用 Three.js（CDN 引入）绘制缓慢漂浮的柔和星点；
 *   2. 如果 Three.js 加载失败（例如网络不通），自动降级为 2D Canvas 星空，
 *      页面仍然有星点效果，不会一片空白；
 *   3. 跟随明暗主题自动更换星星颜色；
 *   4. 移动端自动减少星星数量，节省电量；
 *   5. 用户系统开启“减少动态效果”时，只绘制静态星点。
 * =====================================================================
 */
(function () {
  "use strict";

  // 全局暴露一个对象，main.js 切换主题时会调用 heroBackground.setTheme()
  window.heroBackground = null;

  const container = document.getElementById("hero-bg");
  if (!container) return; // 找不到背景容器就直接退出

  // 是否减少动态效果（尊重系统无障碍设置）
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 判断设备：窄屏（手机/平板竖屏）减少星星数量
  const isMobile = window.innerWidth < 768;

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
   * 方案一：Three.js 3D 柔和星点
   * ================================================================== */
  function createThreeBackground() {
    let renderer, scene, camera, group, stars, brightStars, rafId = 0;
    let normalColor, brightColor, running = true;

    // --- 1. 创建渲染器（开启透明，让 CSS 天空渐变透出来） ---
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
    function makePositions(count, spreadY) {
      const positions = new Float32Array(count * 3);
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * w * 1.25;     // X：左右铺满并略超出
        positions[i * 3 + 1] = (Math.random() - 0.5) * h * (spreadY || 1.15); // Y
        positions[i * 3 + 2] = (Math.random() - 0.5) * 320;      // Z：前后错落，形成景深
      }
      return positions;
    }

    function makePoints(count, size, color) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(makePositions(count), 3));
      const material = new THREE.PointsMaterial({
        size: size,
        map: makeStarTexture(),
        color: color,
        transparent: true,
        opacity: 0.85,
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

      // 普通小星星（背景层）：手机 140 颗 / 桌面 240 颗
      stars = makePoints(isMobile ? 140 : 240, isMobile ? 3.2 : 3.0, normalColor);
      // 明亮大星星（前景层）：手机 35 颗 / 桌面 70 颗
      brightStars = makePoints(isMobile ? 35 : 70, isMobile ? 5.2 : 4.6, brightColor);
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
      // 重新生成位置，让星星始终铺满首屏
      rebuildStars();
    }

    window.addEventListener("resize", resize);

    // --- 6. 动画循环：缓慢旋转 + 呼吸闪烁 ---
    const startTime = performance.now();

    function animate(now) {
      if (!running) return;
      rafId = requestAnimationFrame(animate);

      const t = (now - startTime) / 1000;

      // 整个星云绕 Y 轴极慢旋转，制造星星流动的错觉
      group.rotation.y = Math.sin(t * 0.06) * 0.12;

      // 两层星星以相反节奏“呼吸”，亮度此起彼伏，非常柔和
      if (stars && brightStars) {
        stars.material.opacity = 0.55 + 0.25 * Math.sin(t * 0.7 + stars.userData.phase);
        brightStars.material.opacity = 0.45 + 0.35 * Math.sin(t * 0.9 + Math.PI + brightStars.userData.phase);
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
      // 主题切换时调用：更新星星颜色
      setTheme() {
        if (stars && brightStars) {
          const colors = getThemeColors();
          stars.material.color.set(colors.normal);
          brightStars.material.color.set(colors.bright);
        }
        // 颜色变了以后立即重画一帧
        if (reduceMotion) renderer.render(scene, camera);
      },
      // 页面卸载时清理资源（一般用不到，但保持良好习惯）
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
   * ================================================================== */
  function createCanvasFallback() {
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
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
      const count = isMobile ? 90 : 170;
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.4 + Math.random() * 1.5,          // 半径：小星点为主
          baseAlpha: 0.25 + Math.random() * 0.5,  // 基础透明度
          speed: 0.03 + Math.random() * 0.12,     // 下落速度
          phase: Math.random() * Math.PI * 2,     // 闪烁相位
          bright: Math.random() > 0.82,           // 少数是亮星
          color: colors[Math.random() > 0.85 ? "bright" : "normal"]
        });
      }
    }

    function resize() {
      w = canvas.clientWidth || container.clientWidth;
      h = canvas.clientHeight || container.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeStars();
    }

    function draw(t) {
      if (!running) return;
      // 静态模式（减少动态效果）下不再安排下一帧
      if (!reduceMotion) rafId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, w, h);

      const colors = getThemeColors();
      for (const star of stars) {
        // 星星慢慢向下飘，飘出底部后回到顶部（像夜空中的流云）
        if (!reduceMotion) {
          star.y += star.speed;
          if (star.y > h + 4) { star.y = -4; star.x = Math.random() * w; }
        }

        // 柔和闪烁：透明度随正弦变化
        const twinkle = reduceMotion ? 0 : 0.3 * Math.sin(t * 0.0012 + star.phase);
        const alpha = Math.max(0.08, Math.min(1, star.baseAlpha + twinkle));
        const color = star.color === "bright" ? colors.bright : colors.normal;

        // 用径向渐变绘制发光圆点（两层：外圈光晕 + 内核）
        const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.r * 4);
        glow.addColorStop(0, color);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = alpha * (star.bright ? 0.95 : 0.65);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r * 0.65, 0, Math.PI * 2);
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
        makeStars(); // 主题变化后重新随机配色
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
