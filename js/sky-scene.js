/* =====================================================================
 *  sky-scene.js —— 亮色主题的“宇宙 → 天空 → 大地”背景场景
 * =====================================================================
 *  【功能】
 *   1. 只在亮色主题显示；暗色主题由 three-bg.js 的星空接管；
 *   2. 背景随滚动高度变化：页面顶部是宇宙，往下是天空，再往下是大地；
 *   3. 不同高度放置不同物体：
 *      - 高空/宇宙：太阳、月亮、火箭、人造卫星、火星巡视器
 *      - 中空/天空：飞机、热气球、无人机、北斗/GPS 导航卫星
 *      - 低空/大地：绿树、机器人、智能基站等智能设备
 *   4. 所有物体都贴边摆放，避开中间文字；跟随鼠标移动，
 *      鼠标移出网页后平滑回到自己的位置。
 * =====================================================================
 */
(function () {
  "use strict";

  window.skyScene = null;

  const container = document.getElementById("sky-scene");
  if (!container) return;

  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let enabled = false;      // 只在亮色主题运行
  let running = false;
  let rafId = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let parX = 0;             // 当前鼠标视差 X（会平滑回到 0）
  let parY = 0;

  /* ------------------------------------------------------------------
   * 场景物体：xFrac = 横向位置（贴边，避开中间文字）
   *           docY = 在整页文档中的高度比例（0 最顶部 / 1 最底部）
   *           depth = 视差强度，高空物体移动更明显
   * ------------------------------------------------------------------ */
  const OBJECTS = [
    // ---- 宇宙层（页面顶部，高度最高） ----
    { type: "rocket",   emoji: "🚀", x: 0.030, docY: 0.015, size: 34, depth: 0.5 },
    { type: "moon",     emoji: "🌙", x: 0.970, docY: 0.010, size: 38, depth: 0.3 },
    { type: "sat",      emoji: "🛰️", x: 0.030, docY: 0.045, size: 26, depth: 0.45, label: "人造卫星" },
    { type: "sat",      emoji: "🛰️", x: 0.970, docY: 0.055, size: 24, depth: 0.45 },
    { type: "rover",    emoji: "",  x: 0.970, docY: 0.070, size: 30, depth: 0.4, label: "火星巡视器" },
    { type: "sun",      emoji: "☀️", x: 0.965, docY: 0.105, size: 46, depth: 0.25 },

    // ---- 天空层（页面中部） ----
    { type: "plane",    emoji: "✈️", x: 0.030, docY: 0.185, size: 30, depth: 0.5 },
    { type: "balloon",  emoji: "🎈", x: 0.970, docY: 0.255, size: 34, depth: 0.35 },
    { type: "drone",    emoji: "🚁", x: 0.030, docY: 0.335, size: 30, depth: 0.42 },
    { type: "sat",      emoji: "🛰️", x: 0.970, docY: 0.385, size: 24, depth: 0.38, label: "北斗导航" },
    { type: "sat",      emoji: "🛰️", x: 0.030, docY: 0.450, size: 22, depth: 0.36, label: "GPS 导航" },
    { type: "cloud",    emoji: "☁️", x: 0.030, docY: 0.310, size: 44, depth: 0.18 },
    { type: "cloud",    emoji: "☁️", x: 0.970, docY: 0.520, size: 40, depth: 0.16 },

    // ---- 大地层（页面底部，高度最低） ----
    { type: "tree",     emoji: "🌳", x: 0.030, docY: 0.855, size: 38, depth: 0.20 },
    { type: "tree",     emoji: "🌲", x: 0.970, docY: 0.870, size: 34, depth: 0.20 },
    { type: "tower",    emoji: "📡", x: 0.970, docY: 0.900, size: 32, depth: 0.22, label: "智能基站" },
    { type: "tree",     emoji: "🌳", x: 0.030, docY: 0.940, size: 34, depth: 0.18 }
  ];

  function resize() {
    w = container.clientWidth || window.innerWidth;
    h = container.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawBackground(scrollY, docH) {
    // 画布只覆盖当前视口；渐变按整页文档高度计算，滚动时等于“镜头”往下移动：
    // 顶部看到宇宙，中部看到天空，底部看到大地。
    const g = ctx.createLinearGradient(0, -scrollY, 0, docH - scrollY);
    g.addColorStop(0.00, "#050a18");   // 宇宙深空
    g.addColorStop(0.08, "#0c2242");   // 宇宙 → 天空过渡（尽早进入天空，保证文字清晰）
    g.addColorStop(0.18, "#6fc3ff");   // 天空蓝
    g.addColorStop(0.55, "#bfe9ff");   // 浅天蓝
    g.addColorStop(0.80, "#b6dfaa");   // 天空 → 大地
    g.addColorStop(1.00, "#5da45d");   // 大地绿
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawRover(x, y, size) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);
    // 太阳能板
    ctx.fillStyle = "#234e9c";
    ctx.fillRect(-s * 0.85, -s * 0.55, s * 0.85, s * 0.62);
    ctx.strokeStyle = "#bfd6ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(-s * 0.85, -s * 0.55, s * 0.85, s * 0.62);
    // 巡视器主体
    ctx.fillStyle = "#d8b56a";
    ctx.fillRect(-s * 0.35, -s * 0.10, s * 0.70, s * 0.34);
    ctx.fillStyle = "#8a6a30";
    ctx.fillRect(-s * 0.35, -s * 0.10, s * 0.70, s * 0.12);
    // 轮子
    ctx.fillStyle = "#1c1f24";
    [[-0.32, 0.24], [0.32, 0.24], [-0.28, 0.44], [0.28, 0.44]].forEach((p) => {
      ctx.beginPath();
      ctx.arc(p[0] * s, p[1] * s, s * 0.13, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawObject(obj, x, y) {
    ctx.save();
    if (obj.type === "rover") {
      drawRover(x, y, obj.size);
      if (obj.label) {
        ctx.font = "600 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(30,60,110,0.85)";
        ctx.fillText(obj.label, x, y + obj.size * 1.1);
      }
      ctx.restore();
      return;
    }

    // 太阳：渐变圆 + 光芒
    if (obj.type === "sun") {
      const r = obj.size / 2;
      const glow = ctx.createRadialGradient(x, y, r * 0.15, x, y, r * 1.7);
      glow.addColorStop(0, "rgba(255, 214, 90, 0.95)");
      glow.addColorStop(1, "rgba(255, 214, 90, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd65c";
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    // 其他物体用 emoji 绘制，清晰、不糊
    ctx.font = obj.size + "px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(obj.emoji, x, y);
    if (obj.label) {
      ctx.font = "600 11px sans-serif";
      ctx.fillStyle = "rgba(30, 60, 110, 0.88)";
      ctx.fillText(obj.label, x, y + obj.size * 0.9);
    }
    ctx.restore();
  }

  function draw() {
    const docH = Math.max(h, document.documentElement.scrollHeight || document.body.scrollHeight || h);
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const mouse = window.heroMouse || { x: 0, y: 0, active: false };

    // 鼠标视差目标：鼠标移动时偏移，移出网页后归零
    const targetX = mouse.active ? mouse.x * 80 : 0;
    const targetY = mouse.active ? mouse.y * 46 : 0;
    if (!reduceMotion) {
      parX += (targetX - parX) * 0.055;
      parY += (targetY - parY) * 0.055;
    } else {
      parX = 0;
      parY = 0;
    }

    drawBackground(scrollY, docH);

    for (const obj of OBJECTS) {
      const baseY = obj.docY * docH;
      const drawY = baseY - scrollY;
      if (drawY < -90 || drawY > h + 90) continue; // 不在当前视口就不画
      const drawX = obj.x * w + parX * obj.depth;
      drawObject(obj, drawX, drawY + parY * obj.depth);
    }
  }

  function loop() {
    if (!enabled) return;
    rafId = requestAnimationFrame(loop);
    draw();
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  window.addEventListener("resize", resize);

  window.skyScene = {
    setTheme(theme) {
      if (theme === "light") {
        container.style.display = "block";
        enabled = true;
        start();
      } else {
        enabled = false;
        stop();
        container.style.display = "none";
      }
    },
    destroy() {
      stop();
      window.removeEventListener("resize", resize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  };
})();
