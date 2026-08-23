/* =====================================================================
 *  main.js —— 页面渲染与全部交互逻辑
 * =====================================================================
 *  【作用】
 *   1. 读取 js/config.js 中的 SITE_CONFIG，把内容渲染到 index.html 各区域；
 *   2. 实现：打字机动画、贪吃蛇小游戏、明暗主题切换、项目筛选、
 *      照片灯箱、复制提示、滚动动画、回到顶部、导航高亮等。
 *  【注意】本文件不需要你修改；要改内容请去 config.js。
 * =====================================================================
 */
(function () {
  "use strict";

  // 初始化入口（注意：启动调用放在本文件最后，确保所有工具函数都已定义）
  function init() {
    // 容错：如果 config.js 没加载成功，就不渲染，避免整页报错
    if (typeof SITE_CONFIG === "undefined") {
      console.error("未找到 SITE_CONFIG，请检查 js/config.js 是否存在。");
      return;
    }

    applyGlobalConfig();   // 标题、图标、默认主题
    renderNav();           // 顶部导航
    renderHero();          // 首屏（含贪吃蛇）
    renderSectionHeads();  // 各版块标题
    renderAbout();         // 关于我 + 教育经历
    renderSkills();        // 技能
    renderResearch();      // 科研经历
    renderProjects();      // 项目展示
    renderGallery();       // 光影瞬间照片墙
    renderContact();       // 联系我
    renderFooter();        // 页脚版权
    bindGlobalEvents();    // 滚动、菜单、主题等事件
    observeReveals();      // 滚动入场动画
    initBusuanziCheck();   // 访问量统计兜底提示
  }

  /* ------------------------------------------------------------------
   * 小工具函数
   * ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);

  // 把用户填写的内容安全转义，避免配置里出现 < > & 等符号时破坏页面
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // 弹出底部轻提示
  let toastTimer = 0;
  function showToast(message) {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  // 复制文字到剪贴板（优先新 API，旧浏览器用临时输入框兜底）
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      try {
        const input = document.createElement("textarea");
        input.value = text;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // 各社交平台的内联 SVG 图标（如需更换图标，替换这里的 path 即可）
  const ICONS = {
    github:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>',
    bilibili:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="13" rx="2.6"/><path d="M8.2 6l1.7-3M15.8 6l-1.7-3"/><circle cx="9.2" cy="11.4" r="1.15" fill="currentColor" stroke="none"/><circle cx="14.8" cy="11.4" r="1.15" fill="currentColor" stroke="none"/><path d="M6.6 15.6c1.6.9 3.4 1.3 5.4 1.3s3.8-.4 5.4-1.3"/></svg>',
    email:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>',
    qq:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.1c2.55 0 4.35 1.95 4.35 4.5 0 1.95-1.1 3.7-2.55 5.05l.95 2.5h.55c2.5 0 4.5 1.3 4.5 3.35 0 .7-.3 1.25-.8 1.6-.2.5-.65.9-1.15 1.15-.8.3-1.9.5-3.35.5-2.45 0-4.2-.7-5-1.8-.8 1.1-2.55 1.8-5 1.8-1.45 0-2.55-.2-3.35-.5-.5-.25-.95-.65-1.15-1.15-.5-.35-.8-.9-.8-1.6 0-2.05 2-3.35 4.5-3.35h.55l.95-2.5C8.75 10.3 7.65 8.55 7.65 6.6c0-2.55 1.8-4.5 4.35-4.5z"/><circle cx="10.3" cy="6.9" r="1" fill="#fff"/><circle cx="13.7" cy="6.9" r="1" fill="#fff"/></svg>',
    wechat:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 4C5.9 4 3 6.5 3 9.5c0 1.7.9 3.2 2.3 4.2L4.7 16l2.7-1.3c.7.2 1.4.3 2.1.3"/><path d="M14.5 7.5C18.1 7.5 21 10 21 13c0 1.6-.8 3-2.1 4l.5 2.1-2.5-1.2c-.6.2-1.2.3-1.9.3-3.6 0-6.5-2.5-6.5-5.5S10.9 7.5 14.5 7.5z"/></svg>',
    zhihu:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9.2"/><text x="12" y="16.4" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" stroke="none">知</text></svg>',
    csdn:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><text x="12" y="16.4" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" stroke="none">C</text></svg>'
  };

  // 根据 type 返回图标 HTML；不认识的类型给一个通用星形图标
  function iconOf(type) {
    return ICONS[type] || '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 6.2L21 9l-5 4.3L17.6 20 12 16.4 6.4 20 8 13.3 3 9l6.6-.8z"/></svg>';
  }

  /* ------------------------------------------------------------------
   * 一、全局信息：标题 / 描述 / 图标 / 默认主题
   * ------------------------------------------------------------------ */
  function applyGlobalConfig() {
    document.title = SITE_CONFIG.pageTitle || "个人学术主页";

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = SITE_CONFIG.metaDescription || "";

    if (SITE_CONFIG.favicon) {
      const link = document.querySelector('link[rel="icon"]');
      if (link) link.href = SITE_CONFIG.favicon;
    }

    // 读取浏览器记住的主题；没有记录则用 config.js 里的默认主题
    let savedTheme = "";
    try {
      savedTheme = localStorage.getItem("site-theme") || "";
    } catch (error) {
      // 个别浏览器（隐私模式）禁用 localStorage，忽略即可
    }
    const theme = savedTheme || SITE_CONFIG.defaultTheme || "light";
    applyTheme(theme);
  }

  // 应用主题到 <html data-theme="...">，CSS 变量会自动切换
  function applyTheme(theme) {
    if (theme !== "light" && theme !== "dark") theme = "light";
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("site-theme", theme);
    } catch (error) {
      // 存储失败不影响功能
    }

    // 切换右上角太阳/月亮图标
    const sun = $("theme-icon-sun");
    const moon = $("theme-icon-moon");
    if (sun) sun.style.display = theme === "light" ? "none" : "";
    if (moon) moon.style.display = theme === "dark" ? "none" : "";

    // 浏览器地址栏颜色（浅色蓝 / 深色蓝）
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = theme === "dark" ? "#081426" : "#29b6f6";

    // 通知星空背景换色
    if (window.heroBackground && window.heroBackground.setTheme) {
      window.heroBackground.setTheme(theme);
    }
    // 通知贪吃蛇重绘（在它创建之后会注册这个回调）
    if (window.snakeOnThemeChange) window.snakeOnThemeChange(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  }

  /* ------------------------------------------------------------------
   * 二、渲染顶部导航栏
   * ------------------------------------------------------------------ */
  function renderNav() {
    const nav = SITE_CONFIG.nav || { brand: "你的姓名", links: [] };

    // 品牌区：小头像 + 姓名
    const brand = $("nav-brand");
    if (brand) {
      brand.innerHTML =
        '<img class="brand-avatar" src="' + escapeHtml(SITE_CONFIG.avatar) + '" alt="头像" />' +
        "<span>" + escapeHtml(nav.brand) + "</span>";
    }

    // 桌面端 + 移动端链接
    const linksHtml = (nav.links || [])
      .map((link) => '<a href="#' + escapeHtml(link.id) + '">' + escapeHtml(link.text) + "</a>")
      .join("");

    const desktopNav = $("nav-links");
    const mobileNav = $("mobile-menu");
    if (desktopNav) desktopNav.innerHTML = linksHtml;
    if (mobileNav) mobileNav.innerHTML = linksHtml;
  }

  /* ------------------------------------------------------------------
   * 三、渲染首屏（左侧介绍 + 右侧贪吃蛇）
   * ------------------------------------------------------------------ */
  function renderHero() {
    const hero = SITE_CONFIG.hero || {};
    const left = $("hero-left");
    if (!left) return;

    // 徽章
    const badges = (hero.badges || [])
      .map((b) => '<span class="hero-badge">' + escapeHtml(b.icon) + " " + escapeHtml(b.text) + "</span>")
      .join("");

    // 大按钮
    const buttons = (hero.buttons || [])
      .map((b) => {
        const cls = b.type === "ghost" ? "btn-ghost" : "btn-primary";
        return '<a class="btn ' + cls + '" href="' + escapeHtml(b.href) + '">' + escapeHtml(b.text) + "</a>";
      })
      .join("");

    // 社交图标
    const socials = (hero.socials || [])
      .map(
        (s) =>
          '<a class="social-btn" href="' + escapeHtml(s.url || "#") + '" target="_blank" rel="noopener" aria-label="' +
          escapeHtml(s.label) + '" title="' + escapeHtml(s.label) + '">' + iconOf(s.type) + "</a>"
      )
      .join("");

    left.innerHTML =
      '<span class="hero-greeting">' + escapeHtml(hero.greeting || "你好，我是") + "</span>" +
      '<h1 class="hero-name">' + escapeHtml(hero.name || "你的姓名") + "</h1>" +
      '<div class="hero-role"><span class="typed-text"></span><span class="typed-cursor"></span></div>' +
      '<p class="hero-desc">' + escapeHtml(hero.description || "") + "</p>" +
      '<div class="hero-badges">' + badges + "</div>" +
      '<div class="hero-buttons">' + buttons + "</div>" +
      '<div class="hero-socials">' + socials + "</div>";

    // 身份文字打字机动画
    startTyping($("hero-left").querySelector(".typed-text"), hero.role || "");

    // 贪吃蛇模块
    if (SITE_CONFIG.snake && SITE_CONFIG.snake.enabled !== false) {
      renderSnakeCard();
    } else {
      const right = $("hero-right");
      if (right) right.innerHTML = "";
    }
  }

  // 打字机动画：一个字一个字显示，结束后重新开始循环
  function startTyping(element, text) {
    if (!element) return;
    // 用户系统要求减少动态效果时，直接显示完整文字
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.textContent = text;
      return;
    }
    let index = 0;
    function type() {
      if (index <= text.length) {
        element.textContent = text.slice(0, index);
        index++;
        setTimeout(type, 95);
      } else {
        // 停留 2 秒后清空重来
        setTimeout(() => {
          index = 0;
          type();
        }, 2200);
      }
    }
    type();
  }

  /* ==================================================================
   * 贪吃蛇小游戏（首屏右侧装饰模块）
   *  - 默认“自动游动”模式：AI 自动找食物，像动态装饰一样；
   *  - 用户按方向键 / WASD / 屏幕滑动 / 方向按钮即可接管手动控制；
   *  - 自动模式永远不会卡死，撞墙会自动重新开始。
   * ================================================================== */
  let snake = null; // 贪吃蛇实例，供全局键盘事件使用

  function renderSnakeCard() {
    const config = SITE_CONFIG.snake || {};
    const right = $("hero-right");
    if (!right) return;

    right.innerHTML =
      '<div class="snake-card glass-card reveal">' +
      '  <div class="snake-head">' +
      '    <span class="snake-title">🐍 ' + escapeHtml(config.title || "贪吃蛇") + "</span>" +
      '    <span class="snake-score" id="snake-score">得分 0</span>' +
      "  </div>" +
      '  <p class="snake-subtitle">' + escapeHtml(config.subtitle || "") + "</p>" +
      '  <p class="snake-tip">🖱️ 点击下方方向按钮 / 长按 / 滑动画布即可控制，无需键盘</p>' +
      '  <div class="snake-canvas-wrap" id="snake-wrap"><canvas id="snake-canvas" aria-label="贪吃蛇小游戏画布"></canvas></div>' +
      '  <div class="snake-controls">' +
      '    <div class="dpad" aria-label="方向控制">' +
      '      <button type="button" class="up" data-dir="up" aria-label="向上">▲</button>' +
      '      <button type="button" class="left" data-dir="left" aria-label="向左">◀</button>' +
      '      <button type="button" class="center" id="snake-pause" aria-label="暂停/继续">⏸</button>' +
      '      <button type="button" class="right" data-dir="right" aria-label="向右">▶</button>' +
      '      <button type="button" class="down" data-dir="down" aria-label="向下">▼</button>' +
      "    </div>" +
      '    <div class="snake-actions">' +
      '      <button type="button" class="mini-btn active" id="snake-auto">自动游动</button>' +
      '      <button type="button" class="mini-btn" id="snake-reset">重新开始</button>' +
      "    </div>" +
      "  </div>" +
      "</div>";

    snake = new SnakeGame({
      canvas: $("snake-canvas"),
      wrap: $("snake-wrap"),
      scoreEl: $("snake-score"),
      autoBtn: $("snake-auto"),
      resetBtn: $("snake-reset"),
      pauseBtn: $("snake-pause"),
      gridSize: config.gridSize || 17,
      speed: config.speed || 150,
      autoPlay: config.autoPlay !== false
    });
    snake.init();
  }

  function SnakeGame(options) {
    this.canvas = options.canvas;
    this.wrap = options.wrap;
    this.scoreEl = options.scoreEl;
    this.autoBtn = options.autoBtn;
    this.resetBtn = options.resetBtn;
    this.pauseBtn = options.pauseBtn;
    this.gridSize = options.gridSize;
    this.speed = options.speed;
    this.autoPlay = options.autoPlay;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 游戏内部状态
    this.snakeBody = [];   // 蛇身坐标数组 [{x, y}]
    this.food = { x: 0, y: 0 };
    this.dir = "right";    // 当前移动方向
    this.nextDir = "right";// 下一次要用的方向（防止一帧内连续掉头）
    this.score = 0;
    this.alive = true;
    this.mode = this.autoPlay ? "auto" : "manual"; // auto = AI自动 / manual = 手动
    this.paused = false;
    this.visible = true;
    this.timer = 0;
    this.ctx = null;
    this.cell = 0;
    this.dpr = 1;
  }

  SnakeGame.prototype.init = function () {
    const self = this;

    // 画布按屏幕清晰度设置实际像素（CSS 尺寸由样式表控制）
    this.resizeCanvas();
    this.ctx = this.canvas.getContext("2d");
    this.resetGame();
    this.draw();

    // 系统要求减少动态效果时：不自动游动，只作为静态装饰（仍可手动控制）
    if (this.reduceMotion) {
      this.mode = "manual";
      this.autoBtn.textContent = "手动模式";
      this.autoBtn.classList.remove("active");
    }

    window.addEventListener("resize", this.onResize = () => {
      self.resizeCanvas();
      self.draw();
    });

    // 屏幕滑动控制（移动端）：记录起点与终点判断方向
    this.wrap.addEventListener("touchstart", this.onTouchStart = (event) => {
      self.touchStart = event.touches[0];
    }, { passive: true });

    this.wrap.addEventListener("touchend", this.onTouchEnd = (event) => {
      if (!self.touchStart) return;
      const end = event.changedTouches[0];
      const dx = end.clientX - self.touchStart.clientX;
      const dy = end.clientY - self.touchStart.clientY;
      self.touchStart = null;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return; // 滑动太短视为误触
      self.setManualMode();
      if (Math.abs(dx) > Math.abs(dy)) {
        self.requestDirection(dx > 0 ? "right" : "left");
      } else {
        self.requestDirection(dy > 0 ? "down" : "up");
      }
    }, { passive: true });

    // 方向键按钮：支持单击、长按（按住会连续移动）
    // 注意：按钮在整张蛇卡片里，不在画布 wrap 内，所以用 closest 往上找整张卡片
    const cardEl = this.canvas.closest ? this.canvas.closest(".snake-card") : (this.canvas.parentElement && this.canvas.parentElement.parentElement);
    const directionBtns = cardEl ? cardEl.querySelectorAll("[data-dir]") : [];
    directionBtns.forEach((btn) => {
      // 单击：走一步（键盘激活按钮时 click 的 detail 为 0）
      btn.addEventListener("click", (event) => {
        if (event.detail !== 0) return; // 鼠标点击会由 pointerdown 处理，避免重复走两步
        self.setManualMode();
        self.requestDirection(btn.dataset.dir);
      });
      // 指针按下：立即接管并开始长按连续移动
      btn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        btn.classList.add("holding");
        self.startHold(btn.dataset.dir);
      });
      // 松开 / 移出按钮：停止长按
      ["pointerup", "pointerleave", "pointercancel"].forEach((type) => {
        btn.addEventListener(type, () => {
          btn.classList.remove("holding");
          self.stopHold();
        });
      });
    });

    // 自动 / 手动切换按钮
    this.autoBtn.addEventListener("click", () => {
      if (self.mode === "auto") {
        self.setManualMode();
      } else {
        if (!self.alive) self.resetGame(); // 失败状态下切自动先重开
        self.mode = "auto";
        self.autoBtn.textContent = "自动游动";
        self.autoBtn.classList.add("active");
        self.paused = false;
        self.pauseBtn.textContent = "⏸";
        self.startLoop();
      }
    });

    // 重新开始按钮
    this.resetBtn.addEventListener("click", () => {
      self.resetGame();
      if (self.mode === "auto") self.startLoop();
      self.draw();
    });

    // 暂停 / 继续（中间按钮）
    this.pauseBtn.addEventListener("click", () => {
      self.paused = !self.paused;
      self.pauseBtn.textContent = self.paused ? "▶" : "⏸";
      // 继续后：自动模式要重新安排计时器
      if (!self.paused && self.mode === "auto" && self.alive) self.startLoop();
    });

    // 页面滚动时：蛇蛇在屏幕外就暂停计时，省电
    if ("IntersectionObserver" in window) {
      this.observer = new IntersectionObserver((entries) => {
        self.visible = entries[0].isIntersecting;
        self.startLoop(); // 重新安排计时器
      }, { threshold: 0.1 });
      this.observer.observe(this.wrap);
    }

    // 主题切换后重绘（颜色跟随主题）
    window.snakeOnThemeChange = () => self.draw();

    // 开启自动模式
    if (this.mode === "auto") this.startLoop();
  };

  // 设置画布实际像素大小（适配高清屏）
  SnakeGame.prototype.resizeCanvas = function () {
    const size = this.wrap.clientWidth || 320;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = size * this.dpr;
    this.canvas.height = size * this.dpr;
    this.cell = this.canvas.width / this.gridSize;
  };

  // 初始化一条居中的小蛇和第一个食物
  SnakeGame.prototype.resetGame = function () {
    const mid = Math.floor(this.gridSize / 2);
    this.snakeBody = [];
    for (let i = 0; i < 4; i++) {
      this.snakeBody.push({ x: mid - i, y: mid });
    }
    this.dir = "right";
    this.nextDir = "right";
    this.score = 0;
    this.alive = true;
    this.paused = false;
    this.pauseBtn && (this.pauseBtn.textContent = "⏸");
    this.placeFood();
    this.updateScore();
  };

  // 在空白位置随机放食物
  SnakeGame.prototype.placeFood = function () {
    const free = [];
    // 简单策略：随机尝试，直到找到不在蛇身上的格子
    for (let tries = 0; tries < 500; tries++) {
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      if (!this.snakeBody.some((seg) => seg.x === x && seg.y === y)) {
        this.food = { x, y };
        return;
      }
    }
    this.food = { x: 0, y: 0 };
  };

  SnakeGame.prototype.updateScore = function () {
    if (this.scoreEl) this.scoreEl.textContent = "得分 " + this.score;
  };

  // 用户接管：把自动模式切到手动模式
  SnakeGame.prototype.setManualMode = function () {
    if (this.mode === "auto") {
      this.mode = "manual";
      this.autoBtn.textContent = "手动模式";
      this.autoBtn.classList.remove("active");
      this.stopLoop();
    }
    if (!this.alive) {
      this.resetGame();
    }
  };

  // 记录用户想去的方向（禁止 180 度掉头）
  SnakeGame.prototype.requestDirection = function (dir) {
    const opposite = { up: "down", down: "up", left: "right", right: "left" };
    if (opposite[dir] === this.dir) return;
    this.nextDir = dir;
    if (this.mode === "manual" && this.alive && !this.paused) {
      this.tick(); // 手动模式：按一下走一步，反馈更快
    }
  };

  // 长按页面方向按钮：接管手动模式并持续向该方向移动
  SnakeGame.prototype.startHold = function (dir) {
    const self = this;
    this.stopHold(); // 先清除旧的长按计时
    this.setManualMode(); // 长按会切到手动模式
    this.requestDirection(dir); // 先走第一步，反馈立刻出现
    if (!this.alive || this.paused) return;
    this.holdTimer = setInterval(() => {
      if (!self.alive || self.paused) {
        self.stopHold();
        return;
      }
      self.requestDirection(dir);
    }, Math.max(120, this.speed)); // 速度太快容易撞墙，长按节奏略慢一些
  };

  // 停止长按按钮控制
  SnakeGame.prototype.stopHold = function () {
    clearInterval(this.holdTimer);
    this.holdTimer = 0;
  };

  // 判断某格是否会撞墙或撞到自己
  SnakeGame.prototype.wouldCollide = function (head) {
    if (head.x < 0 || head.y < 0 || head.x >= this.gridSize || head.y >= this.gridSize) return true;
    // 注意：尾巴即将离开的那一格不算碰撞（除非马上吃到食物）
    const bodyToCheck = this.snakeBody.slice(0, -1);
    return bodyToCheck.some((seg) => seg.x === head.x && seg.y === head.y);
  };

  // AI：从不会撞的方向里选一个离食物最近的
  SnakeGame.prototype.chooseAutoDirection = function () {
    const dirs = ["up", "down", "left", "right"];
    const opposite = { up: "down", down: "up", left: "right", right: "left" };
    const move = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

    let best = null;
    let bestDistance = Infinity;
    for (const dir of dirs) {
      if (dir === opposite[this.dir]) continue; // 不能 180 度掉头
      const head = this.snakeBody[0];
      const newHead = { x: head.x + move[dir][0], y: head.y + move[dir][1] };
      if (this.wouldCollide(newHead)) continue;
      const distance = (newHead.x - this.food.x) ** 2 + (newHead.y - this.food.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = dir;
      }
    }
    return best;
  };

  // 前进一步（移动 / 吃食物 / 撞墙）
  SnakeGame.prototype.tick = function () {
    if (!this.alive || this.paused) return;

    // 自动模式先让 AI 决定方向
    if (this.mode === "auto") {
      const autoDir = this.chooseAutoDirection();
      if (!autoDir) {
        // 无路可走：自动模式静默重开，继续当装饰
        this.resetGame();
        return;
      }
      this.nextDir = autoDir;
    }

    this.dir = this.nextDir;
    const move = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const head = this.snakeBody[0];
    const newHead = { x: head.x + move[this.dir][0], y: head.y + move[this.dir][1] };

    // 撞墙 / 撞到自己 -> 游戏结束
    if (this.wouldCollide(newHead)) {
      this.alive = false;
      this.stopLoop();
      this.draw();
      if (this.mode === "manual") showToast("💫 蛇蛇撞到啦，按方向键重新出发");
      return;
    }

    this.snakeBody.unshift(newHead);

    // 吃到食物
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score++;
      this.updateScore();
      this.placeFood();
      // 吃 3 个加速一点点，自动模式看起来越来越精神
      if (this.score % 3 === 0 && this.speed > 90) {
        this.speed = Math.max(90, this.speed - 10);
        this.startLoop();
      }
    } else {
      this.snakeBody.pop(); // 没吃到：移除尾巴
    }
    this.draw();
  };

  // 自动循环计时器
  SnakeGame.prototype.startLoop = function () {
    const self = this;
    this.stopLoop();
    if (this.mode !== "auto" || !this.alive || !this.visible || this.paused) return;
    this.timer = setTimeout(function loop() {
      self.tick();
      if (self.alive && self.visible && self.mode === "auto" && !self.paused) {
        self.timer = setTimeout(loop, self.speed);
      }
    }, this.speed);
  };

  SnakeGame.prototype.stopLoop = function () {
    clearTimeout(this.timer);
    this.timer = 0;
  };

  // 绘制整个画布（天空棋盘 + 发光小蛇 + 苹果）
  SnakeGame.prototype.draw = function () {
    const ctx = this.ctx;
    const size = this.canvas.width;
    const cell = this.cell;
    if (!ctx || size <= 0) return;

    ctx.clearRect(0, 0, size, size);

    // 读取当前主题下的颜色（CSS 变量定义在 style.css 顶部）
    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue("--primary").trim() || "#29b6f6";
    const border = styles.getPropertyValue("--border").trim() || "rgba(41,182,246,0.2)";
    const text = styles.getPropertyValue("--text").trim() || "#102a43";

    // 1. 淡淡的网格线
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    for (let i = 1; i < this.gridSize; i++) {
      const pos = Math.round(i * cell) + 0.5;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 2. 食物：画一个红苹果（用 emoji 绘制，简单又好看）
    ctx.font = Math.round(cell * 0.78) + "px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🍎", this.food.x * cell + cell / 2, this.food.y * cell + cell / 2 + cell * 0.04);

    // 3. 蛇：从头到尾渐变色，头部发光
    for (let i = this.snakeBody.length - 1; i >= 0; i--) {
      const seg = this.snakeBody[i];
      const ratio = 1 - i / Math.max(1, this.snakeBody.length - 1);
      const x = seg.x * cell;
      const y = seg.y * cell;
      const pad = Math.max(1.5, cell * 0.06);
      const radius = cell * 0.22;

      // 头部更亮，尾部渐变为更浅的蓝
      const gradient = ctx.createLinearGradient(x, y, x + cell, y + cell);
      gradient.addColorStop(0, primary);
      gradient.addColorStop(1, "#9be7ff");

      ctx.save();
      ctx.shadowColor = primary;
      ctx.shadowBlur = i === 0 ? cell * 0.45 : cell * 0.2;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      // 兼容不支持 roundRect 的老浏览器：退化为普通圆角矩形
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2, radius);
      } else {
        ctx.rect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
      }
      ctx.fill();
      ctx.restore();

      // 给蛇头画两只小眼睛
      if (i === 0) {
        const cx = x + cell / 2;
        const cy = y + cell / 2;
        const eyeR = Math.max(1.5, cell * 0.07);
        const eyeOff = cell * 0.18;
        ctx.fillStyle = "#ffffff";
        const eyePositions = {
          up: [[cx - eyeOff, cy - eyeOff], [cx + eyeOff, cy - eyeOff]],
          down: [[cx - eyeOff, cy + eyeOff], [cx + eyeOff, cy + eyeOff]],
          left: [[cx - eyeOff, cy - eyeOff], [cx - eyeOff, cy + eyeOff]],
          right: [[cx + eyeOff, cy - eyeOff], [cx + eyeOff, cy + eyeOff]]
        }[this.dir] || [[cx - eyeOff, cy], [cx + eyeOff, cy]];
        ctx.beginPath();
        ctx.arc(eyePositions[0][0], eyePositions[0][1], eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyePositions[1][0], eyePositions[1][1], eyeR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. 手动模式失败时盖一层半透明提示
    if (!this.alive) {
      ctx.fillStyle = "rgba(8, 20, 38, 0.62)";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 " + Math.round(cell * 0.55) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💫 按方向键继续", size / 2, size / 2);
    }

    // 5. 自动模式时在角落画一个小小的“自动”标记
    if (this.mode === "auto" && this.alive) {
      ctx.font = Math.round(cell * 0.34) + "px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = text;
      ctx.globalAlpha = 0.45;
      ctx.fillText("自动模式 · 按键可接管", cell * 0.4, cell * 0.35);
      ctx.globalAlpha = 1;
    }
  };

  // 页面不再需要时清理（本项目单页一般不调用）
  SnakeGame.prototype.destroy = function () {
    this.stopLoop();
    this.stopHold();
    if (this.observer) this.observer.disconnect();
    window.removeEventListener("resize", this.onResize);
    this.wrap.removeEventListener("touchstart", this.onTouchStart);
    this.wrap.removeEventListener("touchend", this.onTouchEnd);
  };

  /* ------------------------------------------------------------------
   * 四、渲染各版块统一标题
   * ------------------------------------------------------------------ */
  function renderSectionHeads() {
    const headMap = {
      about: SITE_CONFIG.about,
      skills: SITE_CONFIG.skills,
      research: SITE_CONFIG.research,
      projects: SITE_CONFIG.projects,
      gallery: SITE_CONFIG.gallery,
      contact: SITE_CONFIG.contact
    };
    document.querySelectorAll("[data-head]").forEach((el) => {
      const data = headMap[el.dataset.head];
      if (!data) return;
      el.innerHTML =
        '<h2 class="section-title">' + escapeHtml(data.title || "") + "</h2>" +
        (data.subtitle ? '<p class="section-subtitle">' + escapeHtml(data.subtitle) + "</p>" : "");
    });
  }

  /* ------------------------------------------------------------------
   * 五、渲染关于我 + 教育经历
   * ------------------------------------------------------------------ */
  function renderAbout() {
    const about = SITE_CONFIG.about || {};
    const education = SITE_CONFIG.education || { items: [] };
    const body = $("about-body");
    if (!body) return;

    // 自我介绍段落
    const paragraphs = (about.intro || [])
      .map((p) => "<p>" + escapeHtml(p) + "</p>")
      .join("");

    // 基本信息条目
    const infoItems = (about.infoItems || [])
      .map(
        (item) =>
          '<div class="info-item"><span class="label">' + escapeHtml(item.label) + '</span>' +
          '<span class="value">' + escapeHtml(item.value) + "</span></div>"
      )
      .join("");

    // 教育经历卡片
    const eduCards = (education.items || [])
      .map(
        (edu) =>
          '<div class="edu-card glass-card reveal">' +
          '  <div class="edu-line"><span>' + escapeHtml(edu.school) + "</span>" +
          '    <span class="edu-time">' + escapeHtml(edu.time) + "</span></div>" +
          '  <p class="edu-major">' + escapeHtml(edu.degree) + " · " + escapeHtml(edu.major) + "</p>" +
          '  <p class="edu-gpa">' + escapeHtml(edu.gpa || "") + "</p>" +
          '  <p class="edu-desc">' + escapeHtml(edu.desc || "") + "</p>" +
          tagRow(edu.tags) +
          "</div>"
      )
      .join("");

    body.innerHTML =
      '<div class="about-intro-card glass-card reveal">' +
      '  <h3>📖 个人简介</h3>' +
      "  " + paragraphs +
      "</div>" +
      '<div class="about-info-card glass-card reveal">' +
      '  <h3>🪪 基本信息</h3>' +
      '  <div class="info-list">' + infoItems + "</div>" +
      "</div>" +
      // 教育经历单独占一整行，并在上方加一个小标题
      ((education.items || []).length
        ? '<h3 class="about-subhead">🎓 教育经历</h3>' +
          '<div class="edu-list">' + eduCards + "</div>"
        : "");

    observeReveals();
  }

  // 生成标签行的通用模板
  function tagRow(tags) {
    if (!tags || !tags.length) return "";
    return '<div class="tag-row">' + tags.map((t) => '<span class="tag">' + escapeHtml(t) + "</span>").join("") + "</div>";
  }

  /* ------------------------------------------------------------------
   * 六、渲染技能
   * ------------------------------------------------------------------ */
  function renderSkills() {
    const skills = SITE_CONFIG.skills || { groups: [] };
    const grid = $("skills-grid");
    if (!grid) return;

    grid.innerHTML = (skills.groups || [])
      .map(
        (group) =>
          '<div class="skill-card glass-card reveal">' +
          '  <div class="skill-category"><span class="skill-icon">' + escapeHtml(group.icon || "⭐") + "</span>" +
          "    " + escapeHtml(group.category) + "</div>" +
          (group.items || [])
            .map(
              (item) =>
                '<div class="skill-item">' +
                '  <div class="skill-name"><span>' + escapeHtml(item.name) + "</span><span>" + Number(item.level || 0) + "%</span></div>" +
                '  <div class="skill-bar"><div class="skill-fill" data-level="' + Number(item.level || 0) + '"></div></div>' +
                "</div>"
            )
            .join("") +
          "</div>"
      )
      .join("");

    // 进度条在进入屏幕时再填充，动画更自然
    const fills = grid.querySelectorAll(".skill-fill");
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.style.width = entry.target.dataset.level + "%";
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      fills.forEach((fill) => observer.observe(fill));
    } else {
      fills.forEach((fill) => (fill.style.width = fill.dataset.level + "%"));
    }
  }

  /* ------------------------------------------------------------------
   * 七、渲染科研经历时间线
   * ------------------------------------------------------------------ */
  function renderResearch() {
    const research = SITE_CONFIG.research || { items: [] };
    const list = $("research-list");
    if (!list) return;

    list.innerHTML = (research.items || [])
      .map(
        (item) =>
          '<div class="timeline-item reveal">' +
          '  <div class="timeline-card glass-card">' +
          '    <span class="timeline-time">' + escapeHtml(item.time) + "</span>" +
          '    <h3 class="timeline-name">' + escapeHtml(item.name) + "</h3>" +
          '    <p class="timeline-role">' + escapeHtml(item.role || "") + "</p>" +
          '    <p class="timeline-desc">' + escapeHtml(item.desc || "") + "</p>" +
          tagRow(item.tags) +
          "  </div>" +
          "</div>"
      )
      .join("");
  }

  /* ------------------------------------------------------------------
   * 八、渲染项目展示（含分类筛选）
   * ------------------------------------------------------------------ */
  function renderProjects() {
    const projects = SITE_CONFIG.projects || { filters: ["全部"], items: [] };
    const filterBar = $("project-filters");
    const grid = $("project-grid");
    if (!grid) return;

    // 顶部筛选按钮
    if (filterBar) {
      filterBar.innerHTML = (projects.filters || ["全部"])
        .map(
          (filter, index) =>
            '<button type="button" class="filter-chip' + (index === 0 ? " active" : "") + '" data-filter="' +
            escapeHtml(filter) + '">' + escapeHtml(filter) + "</button>"
        )
        .join("");
    }

    // 项目卡片
    grid.innerHTML = (projects.items || []).map((project) => {
      const actions = [];
      // GitHub 仓库按钮：链接为 "#" 时隐藏
      if (project.github && project.github !== "#") {
        actions.push(
          '<a class="link-btn" href="' + escapeHtml(project.github) + '" target="_blank" rel="noopener">' + iconOf("github") + " GitHub 仓库</a>"
        );
      }
      // 在线演示按钮：留空 "" 时隐藏
      if (project.demo) {
        actions.push(
          '<a class="link-btn" href="' + escapeHtml(project.demo) + '" target="_blank" rel="noopener">🔗 在线演示</a>'
        );
      }

      return (
        '<article class="project-card glass-card reveal" data-category="' + escapeHtml(project.category) + '">' +
        '  <div class="project-cover"><img src="' + escapeHtml(project.cover) + '" alt="' + escapeHtml(project.title) + '" loading="lazy" /></div>' +
        '  <div class="project-body">' +
        '    <span class="project-category">' + escapeHtml(project.category) + "</span>" +
        '    <h3 class="project-title">' + escapeHtml(project.title) + "</h3>" +
        '    <p class="project-summary">' + escapeHtml(project.summary) + "</p>" +
        tagRow(project.tags) +
        (actions.length ? '<div class="project-actions">' + actions.join("") + "</div>" : "") +
        "  </div>" +
        "</article>"
      );
    }).join("");

    // 筛选逻辑
    if (filterBar) {
      filterBar.querySelectorAll(".filter-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          filterBar.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          const filter = chip.dataset.filter;
          grid.querySelectorAll(".project-card").forEach((card) => {
            const show = filter === "全部" || card.dataset.category === filter;
            card.style.display = show ? "" : "none";
          });
        });
      });
    }
  }

  /* ------------------------------------------------------------------
   * 九、渲染光影瞬间照片墙 + 灯箱
   * ------------------------------------------------------------------ */
  let galleryPhotos = []; // 当前照片列表，供灯箱左右切换
  let galleryIndex = 0;   // 灯箱当前显示第几张

  function renderGallery() {
    const gallery = SITE_CONFIG.gallery || { photos: [] };
    const grid = $("gallery-grid");
    if (!grid) return;

    galleryPhotos = gallery.photos || [];
    grid.innerHTML = galleryPhotos
      .map(
        (photo, index) =>
          '<figure class="photo-card reveal" tabindex="0" data-index="' + index + '" aria-label="查看大图：' + escapeHtml(photo.title) + '">' +
          '  <img src="' + escapeHtml(photo.src) + '" alt="' + escapeHtml(photo.title) + '" loading="lazy" />' +
          '  <span class="photo-date">' + escapeHtml(photo.date || "") + "</span>" +
          '  <figcaption class="photo-overlay">' +
          '    <span class="photo-title">' + escapeHtml(photo.title) + "</span>" +
          '    <span class="photo-desc">' + escapeHtml(photo.desc || "") + "</span>" +
          "  </figcaption>" +
          "</figure>"
      )
      .join("");

    // 点击照片（或键盘回车）打开灯箱
    grid.querySelectorAll(".photo-card").forEach((card) => {
      card.addEventListener("click", () => openLightbox(Number(card.dataset.index)));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(Number(card.dataset.index));
        }
      });
    });
  }

  function openLightbox(index) {
    if (!galleryPhotos.length) return;
    galleryIndex = index;
    updateLightbox();
    const box = $("lightbox");
    box.hidden = false;
    document.body.style.overflow = "hidden"; // 锁定背景滚动
  }

  function closeLightbox() {
    $("lightbox").hidden = true;
    document.body.style.overflow = "";
  }

  function updateLightbox() {
    const photo = galleryPhotos[galleryIndex];
    if (!photo) return;
    $("lightbox-img").src = photo.src;
    $("lightbox-img").alt = photo.title;
    $("lightbox-title").textContent = photo.title;
    $("lightbox-desc").textContent = (photo.date ? photo.date + " · " : "") + (photo.desc || "");
  }

  function lightboxPrev() {
    if (!galleryPhotos.length) return;
    galleryIndex = (galleryIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
    updateLightbox();
  }

  function lightboxNext() {
    if (!galleryPhotos.length) return;
    galleryIndex = (galleryIndex + 1) % galleryPhotos.length;
    updateLightbox();
  }

  /* ------------------------------------------------------------------
   * 十、渲染联系我
   * ------------------------------------------------------------------ */
  function renderContact() {
    const contact = SITE_CONFIG.contact || { cards: [] };
    const grid = $("contact-grid");
    if (!grid) return;

    grid.innerHTML = (contact.cards || [])
      .map(
        (card) =>
          '<div class="contact-card glass-card reveal" data-action="' + escapeHtml(card.action || "link") + '"' +
          ' data-value="' + escapeHtml(card.value || "") + '" data-url="' + escapeHtml(card.url || "") + '"' +
          ' role="button" tabindex="0" aria-label="' + escapeHtml(card.label) + '">' +
          '  <span class="contact-icon">' + iconOf(card.type) + "</span>" +
          '  <span class="contact-label">' + escapeHtml(card.label) + "</span>" +
          '  <span class="contact-value">' + escapeHtml(card.value || "") + "</span>" +
          "</div>"
      )
      .join("");

    // 点击/回车：link 类型新窗口打开，copy 类型复制并提示
    grid.querySelectorAll(".contact-card").forEach((card) => {
      function activate() {
        if (card.dataset.action === "copy") {
          copyText(card.dataset.value)
            .then(() => showToast("✅ 已复制：" + card.dataset.value))
            .catch(() => showToast("❌ 复制失败，请手动选择复制"));
        } else if (card.dataset.url) {
          window.open(card.dataset.url, "_blank", "noopener");
        }
      }
      card.addEventListener("click", activate);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    });
  }

  /* ------------------------------------------------------------------
   * 十一、渲染页脚
   * ------------------------------------------------------------------ */
  function renderFooter() {
    const footer = SITE_CONFIG.footer || {};
    const year = new Date().getFullYear();
    $("footer-copyright").textContent = "© " + year + " " + (footer.copyright || "你的姓名") + " · 保留所有权利";

    if (footer.icp) {
      $("footer-icp").innerHTML =
        '<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">' + escapeHtml(footer.icp) + "</a>";
    }

    // 关闭统计时直接隐藏整个统计行
    if (footer.statsEnabled === false) {
      const stats = document.querySelector(".site-stats");
      if (stats) stats.style.display = "none";
    }
  }

  // 不蒜子统计脚本加载失败时显示兜底提示
  function initBusuanziCheck() {
    if (SITE_CONFIG.footer && SITE_CONFIG.footer.statsEnabled === false) return;

    let waited = 0;
    const timer = setInterval(() => {
      const pv = $("busuanzi_value_site_pv");
      const fallback = $("stat-fallback");
      const divider = document.querySelector(".stat-divider");
      // 脚本成功后会填充非 0 数字并把容器显示出来
      const loaded = pv && pv.textContent.trim() !== "0";

      if (loaded) {
        // 加载成功：隐藏兜底提示，恢复分隔点
        if (fallback) fallback.style.display = "none";
        if (divider) divider.style.display = "";
        clearInterval(timer);
      } else if (waited >= 5000) {
        // 5 秒后仍未加载：显示友好提示
        if (fallback) {
          fallback.textContent = "访问统计暂时无法加载（需联网）";
          fallback.style.display = "";
        }
        if (divider) divider.style.display = "none";
        clearInterval(timer);
      }
      waited += 1000;
    }, 1000);
  }

  /* ------------------------------------------------------------------
   * 十二、全局事件：滚动、菜单、主题、键盘
   * ------------------------------------------------------------------ */
  function bindGlobalEvents() {
    // 1. 主题切换按钮
    $("theme-toggle").addEventListener("click", toggleTheme);

    // 2. 汉堡菜单开关
    const hamburger = $("hamburger");
    const mobileMenu = $("mobile-menu");
    hamburger.addEventListener("click", () => {
      const open = mobileMenu.classList.toggle("open");
      hamburger.classList.toggle("open", open);
      hamburger.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // 点击移动端菜单里的链接后自动收起
    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
        hamburger.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
      });
    });

    // 3. 页面滚动：导航栏毛玻璃 + 回到顶部按钮
    const navbar = $("navbar");
    const backTop = $("back-top");
    function onScroll() {
      const scrolled = window.scrollY > 30;
      navbar.classList.toggle("scrolled", scrolled);
      backTop.classList.toggle("show", window.scrollY > 500);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    // 4. 当前版块高亮（滚动到哪个 section，导航对应项就亮起）
    const navLinks = document.querySelectorAll("#nav-links a, #mobile-menu a");
    const sections = [];
    (SITE_CONFIG.nav.links || []).forEach((link) => {
      const section = document.getElementById(link.id);
      if (section) sections.push({ id: link.id, section });
    });

    if ("IntersectionObserver" in window && sections.length) {
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              navLinks.forEach((link) => {
                link.classList.toggle("active", link.getAttribute("href") === "#" + id);
              });
            }
          });
        },
        { rootMargin: "-45% 0px -50% 0px" } // 以屏幕中线为判断基准
      );
      sections.forEach((item) => spy.observe(item.section));
    }

    // 5. 照片灯箱按钮与键盘操作
    $("lightbox-close").addEventListener("click", closeLightbox);
    $("lightbox-prev").addEventListener("click", lightboxPrev);
    $("lightbox-next").addEventListener("click", lightboxNext);
    $("lightbox").addEventListener("click", (event) => {
      if (event.target === $("lightbox")) closeLightbox(); // 点击图片外区域关闭
    });

    document.addEventListener("keydown", (event) => {
      // 灯箱打开时：Esc 关闭，左右方向切换照片
      const box = $("lightbox");
      if (!box.hidden) {
        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowLeft") lightboxPrev();
        if (event.key === "ArrowRight") lightboxNext();
        return;
      }

      // 贪吃蛇键盘控制（方向键 / WASD）
      if (!snake) return;
      const target = event.target;
      const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (isTyping) return;

      const keyMap = {
        ArrowUp: "up", w: "up", W: "up",
        ArrowDown: "down", s: "down", S: "down",
        ArrowLeft: "left", a: "left", A: "left",
        ArrowRight: "right", d: "right", D: "right"
      };
      if (keyMap[event.key]) {
        // 只有蛇蛇在屏幕内时才拦截方向键，避免影响正常页面滚动
        if (snake.visible) event.preventDefault();
        snake.setManualMode();
        snake.requestDirection(keyMap[event.key]);
      }
    });

    // 窗口尺寸变化时，若回到桌面宽度则收起移动菜单
    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) {
        mobileMenu.classList.remove("open");
        hamburger.classList.remove("open");
      }
    });
  }

  /* ------------------------------------------------------------------
   * 十三、滚动入场动画
   * ------------------------------------------------------------------ */
  function observeReveals() {
    const elements = document.querySelectorAll(".reveal:not(.observed)");
    if (!("IntersectionObserver" in window)) {
      // 老浏览器直接全部显示
      elements.forEach((el) => el.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    elements.forEach((el) => {
      el.classList.add("observed");
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------
   * 十四、启动页面
   *   （放在文件末尾：此时上面所有变量和函数都已经定义完成）
   * ------------------------------------------------------------------ */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
