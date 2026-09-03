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
    initEarthCursor();     // 地球鼠标（并把鼠标坐标共享给星空背景）
    renderNav();           // 顶部导航
    renderToc();           // 左侧银河目录
    renderHero();          // 首屏（含贪吃蛇）
    renderSectionHeads();  // 各版块标题
    renderAbout();         // 关于我 + 教育经历
    renderSkills();        // 技能（单列进度条）
    renderAwards();        // 参加比赛及获奖情况（奖状墙，位于学习经历之前）
    renderProjects();      // 项目成果展示及资料（位于奖项与学习经历之间）
    renderResearch();      // 学习经历（搭扣日记本）
    renderNotes();         // 我的笔记
    renderGallery();       // 光影瞬间照片墙
    renderContact();       // 联系我
    renderFooter();        // 页脚版权
    bindGlobalEvents();    // 滚动、菜单、主题、目录等事件
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

    // 读取浏览器记住的主题；没有记录则用 config.js 里的默认主题（现在默认是暗色）
    // 使用 v2 存储键：本版要求“打开即暗色”，避免沿用旧版保存的亮色记录
    let savedTheme = "";
    try {
      savedTheme = localStorage.getItem("site-theme-v2") || "";
    } catch (error) {
      // 个别浏览器（隐私模式）禁用 localStorage，忽略即可
    }
    const theme = savedTheme || SITE_CONFIG.defaultTheme || "dark";
    applyTheme(theme);
  }

  // 应用主题到 <html data-theme="...">，CSS 变量会自动切换
  function applyTheme(theme) {
    if (theme !== "light" && theme !== "dark") theme = "light";
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("site-theme-v2", theme);
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

    // 通知星空背景换色（暗色显示星空；亮色隐藏星空，改显示天地场景）
    if (window.heroBackground && window.heroBackground.setTheme) {
      window.heroBackground.setTheme(theme);
    }
    // 亮色主题的“宇宙 → 天空 → 大地”场景
    if (window.skyScene && window.skyScene.setTheme) {
      window.skyScene.setTheme(theme);
    }
    // 通知贪吃蛇重绘（在它创建之后会注册这个回调）
    if (window.snakeOnThemeChange) window.snakeOnThemeChange(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  }

  /* ------------------------------------------------------------------
   * 一.五、地球鼠标 + 星空鼠标追踪数据
   *   地球持续自转；鼠标坐标写入 window.heroMouse，three-bg.js 每帧读取，
   *   让星光视角跟随“地球”移动而变化。触屏设备自动跳过。
   * ------------------------------------------------------------------ */
  function initEarthCursor() {
    const cursor = $("earth-cursor");
    if (!cursor) return;

    // 只支持有真实鼠标的设备（触屏不启用，保留原生触摸体验）
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!finePointer.matches) {
      cursor.style.display = "none";
      return;
    }

    document.body.classList.add("earth-cursor-active");

    // 给星空背景共享鼠标坐标（x/y 范围 -1 ~ 1）
    window.heroMouse = { x: 0, y: 0, active: false };

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let visible = false;

    // 记录鼠标位置，并让地球光标出现
    document.addEventListener("mousemove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      window.heroMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      window.heroMouse.y = (event.clientY / window.innerHeight) * 2 - 1;
      window.heroMouse.active = true;
      if (!visible) {
        visible = true;
        cursor.style.opacity = "1";
      }
    });

    // 鼠标离开窗口时藏起地球，避免停在边缘碍眼
    document.addEventListener("mouseleave", () => {
      visible = false;
      cursor.style.opacity = "0";
      window.heroMouse.active = false;
    });

    // 悬停在可点击元素上时，地球稍微放大并点亮轨道
    const interactiveSelector = "a, button, .photo-card, .contact-card, .project-card, .toc-link, .celestial-btn";
    document.addEventListener("mouseover", (event) => {
      if (event.target.closest && event.target.closest(interactiveSelector)) {
        cursor.classList.add("cursor-hover");
      }
    });
    document.addEventListener("mouseout", (event) => {
      if (event.target.closest && event.target.closest(interactiveSelector)) {
        cursor.classList.remove("cursor-hover");
      }
    });

    // 快速跟随：地球几乎贴在鼠标热点上，只保留极轻微平滑，不会让鼠标“变慢”
    function follow() {
      currentX += (targetX - currentX) * 0.7;
      currentY += (targetY - currentY) * 0.7;
      // 14 是小号地球光标尺寸（28px）的一半，保证中心对准鼠标热点
      cursor.style.transform = "translate3d(" + (currentX - 14) + "px," + (currentY - 14) + "px,0)";
      requestAnimationFrame(follow);
    }
    requestAnimationFrame(follow);
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

    // 顶部导航只显示 bar !== false 的条目（其余条目在左侧银河目录里）
    const barLinks = (nav.links || []).filter((link) => link.bar !== false);
    // 桌面端 + 移动端链接；data-nav-id 供滚动监听高亮使用
    const linksHtml = barLinks
      .map(
        (link) =>
          '<a href="#' + escapeHtml(link.id) + '" data-nav-id="' + escapeHtml(link.id) + '">' +
          escapeHtml(link.text) + "</a>"
      )
      .join("");

    const desktopNav = $("nav-links");
    const mobileNav = $("mobile-menu");
    if (desktopNav) desktopNav.innerHTML = linksHtml;
    if (mobileNav) mobileNav.innerHTML = linksHtml;
  }

  // 渲染左侧“银河目录”面板：全部版块 + 结尾的天体导航
  function renderToc() {
    if (SITE_CONFIG.toc && SITE_CONFIG.toc.enabled === false) {
      const toggle = $("toc-toggle");
      const panel = $("toc-panel");
      if (toggle) toggle.style.display = "none";
      if (panel) panel.style.display = "none";
      return;
    }

    const toc = SITE_CONFIG.toc || {};
    if (toc.panelTitle) $("toc-title").textContent = toc.panelTitle;
    if (toc.panelSubtitle) $("toc-subtitle").textContent = toc.panelSubtitle;

    // 全部版块跳转按钮：link.icon（金星/狮子座/火星/土星/人造卫星等）直接作为每项的前缀
    $("toc-links").innerHTML = (SITE_CONFIG.nav.links || [])
      .map(
        (link) =>
          '<a class="toc-link" href="#' + escapeHtml(link.id) + '" data-nav-id="' + escapeHtml(link.id) + '">' +
          '  <span class="toc-link-icon">' + escapeHtml(link.icon || "•") + "</span>" +
          "  <span>" + escapeHtml(link.text) + "</span>" +
          "</a>"
      )
      .join("");
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
      '<div class="hero-welcome">' + escapeHtml(hero.welcome || "欢迎来到我的自制个人主页") + "</div>" +
      '<span class="hero-greeting">' + escapeHtml(hero.greeting || "你好，我是") + "</span>" +
      '<h1 class="hero-name">' + escapeHtml(hero.name || "你的姓名") + "</h1>" +
      '<div class="hero-role"><span class="typed-text"></span><span class="typed-cursor"></span></div>' +
      '<p class="hero-desc">' + escapeHtml(hero.description || "") + "</p>" +
      '<div class="hero-badges">' + badges + "</div>" +
      (hero.showClock !== false ? '<div class="hero-clock" id="hero-clock" aria-live="polite"></div>' : "") +
      '<div class="hero-buttons">' + buttons + "</div>" +
      '<div class="hero-socials">' + socials + "</div>";

    // 身份文字打字机动画
    startTyping($("hero-left").querySelector(".typed-text"), hero.role || "");

    // 首页实时日期与时间（每秒刷新）
    if (hero.showClock !== false) startHeroClock();

    // 贪吃蛇模块
    if (SITE_CONFIG.snake && SITE_CONFIG.snake.enabled !== false) {
      renderSnakeCard();
    } else {
      const right = $("hero-right");
      if (right) right.innerHTML = "";
    }
  }

  // 首页实时日期与时间：每秒更新一次
  function startHeroClock() {
    const el = $("hero-clock");
    if (!el) return;

    const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
    function pad(n) { return String(n).padStart(2, "0"); }
    function tick() {
      const now = new Date();
      el.innerHTML =
        '<span class="hero-clock-date">' +
        now.getFullYear() + " 年 " + (now.getMonth() + 1) + " 月 " + now.getDate() + " 日 · 星期" + WEEK[now.getDay()] +
        "</span>" +
        '<span class="hero-clock-time">' +
        pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds()) +
        "</span>";
    }
    tick();
    setInterval(tick, 1000);
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
   * 贪吃蛇小游戏（首屏右侧：半裸 PCB 游戏机 + 科技蛇）
   *  - 外壳只搭了一部分，裸露出绿色 PCB、芯片、排线和螺丝；
   *  - 默认 AI 自动模式，可随时切换手动：点击方向按钮 / 长按 /
   *    滑动画布 / 键盘 WASD / 空格释放电容技能；
   *  - 食物皮肤：51芯片、32芯片、书本、代码、数据流、电容、
   *    电阻、电感、烧坏的电路板（危险，吃到立即死亡）；
   *  - 蛇身编号“温景淇001号”，每死一次 +1；
   *  - 死亡后播放爆炸动画，5 秒后自动重启；
   *  - 每死一次都弹出一个四字成语成就；长度达到 15 时通关并点亮智慧之星。
   * ================================================================== */
  let snake = null; // 贪吃蛇实例，供全局键盘事件使用

  // 食物皮肤与权重配置：权重越大出现概率越高
  const FOOD_DEFS = {
    code:       { weight: 32, label: "代码",   color: "#7fe0ff", glyph: "💻" },
    chip51:     { weight: 12, label: "51芯片", color: "#3ddc84", glyph: "51" },
    chip32:     { weight: 10, label: "32芯片", color: "#4fc3f7", glyph: "32" },
    book:       { weight: 10, label: "书本",   color: "#ffd166", glyph: "📘" },
    resistor:   { weight: 9,  label: "电阻",   color: "#f4a261", glyph: "Ω" },
    data:       { weight: 8,  label: "数据流", color: "#9b8cff", glyph: "≋" },
    capacitor:  { weight: 8,  label: "电容",   color: "#ff8fab", glyph: "⚡" },
    inductor:   { weight: 6,  label: "电感",   color: "#b8f25a", glyph: "🧲" },
    burnt:      { weight: 5,  label: "烧坏电路板", color: "#ff4d4d", glyph: "🔥" }
  };

  // 成就提示：名字 + 励志语录
  function pushAchievement(name, quote) {
    const box = $("achievement-box");
    if (!box) return;
    const pop = document.createElement("div");
    pop.className = "achievement-pop";
    pop.innerHTML =
      '<div class="achievement-icon">🏆</div>' +
      '<div class="achievement-text">' +
      "  <strong>成就解锁：" + escapeHtml(name) + "</strong>" +
      "  <p>" + escapeHtml(quote) + "</p>" +
      "</div>";
    box.appendChild(pop);
    requestAnimationFrame(() => pop.classList.add("show"));
    setTimeout(() => {
      pop.classList.remove("show");
      setTimeout(() => pop.parentNode && pop.parentNode.removeChild(pop), 350);
    }, 10000); // 成就停留 10 秒
  }

  function renderSnakeCard() {
    const config = SITE_CONFIG.snake || {};
    const right = $("hero-right");
    if (!right) return;

    // 蓝色游戏机外壳：右上角摔掉一个角，露出里面的绿色 PCB 和元件
    right.innerHTML =
      '<div class="snake-card glass-card reveal">' +
      '  <div class="snake-console">' +
      '    <div class="console-broken-pcb"></div>' +
      '    <div class="console-shell-main"></div>' +
      '    <div class="console-break-chip break-chip-1"><span>STM32</span></div>' +
      '    <div class="console-break-chip break-chip-2"><span>51</span></div>' +
      '    <div class="console-break-resistor"></div>' +
      '    <div class="console-screw screw-1"></div>' +
      '    <div class="console-screw screw-2"></div>' +
      '    <div class="console-screw screw-3"></div>' +
      '    <div class="console-led"></div>' +
      '    <div class="snake-head">' +
      '      <span class="snake-title">🐍 ' + escapeHtml(config.title || "贪吃蛇") + "</span>" +
      '      <span class="snake-score" id="snake-score">长度 4</span>' +
      "    </div>" +
      '    <div class="wisdom-zone">' +
      '      <div class="wisdom-star" id="wisdom-star" title="智慧之星">★</div>' +
      '      <div class="wisdom-hint" id="wisdom-hint">' + escapeHtml(config.starHint || "点亮条件：玩家先将贪吃蛇通关失败一次，随后再通关成功一次") + "</div>" +
      "    </div>" +
      '    <div class="pass-rule">通关条件：贪吃蛇长度达到 ' + Number(config.passLength || 15) + ' 即视为游戏通关</div>' +
      '    <div class="snake-mode-badge" id="snake-mode">AI插件托管中</div>' +
      '    <div class="console-screen">' +
      '      <div class="screen-vent vent-1"></div><div class="screen-vent vent-2"></div>' +
      '      <div class="snake-canvas-wrap" id="snake-wrap"><canvas id="snake-canvas" aria-label="贪吃蛇小游戏画布"></canvas></div>' +
      "    </div>" +
      '    <div class="snake-statusbar">' +
      '      <span class="status-serial" id="snake-serial">' + escapeHtml((config.serialName || "温景淇") + "001号") + "</span>" +
      '      <span class="status-item" id="snake-shield">🛡 --</span>' +
      '      <span class="status-item" id="snake-energy">⚡ 未储能</span>' +
      '      <span class="status-item" id="snake-effect">状态正常</span>' +
      "    </div>" +
      '    <div class="snake-controls">' +
      '      <div class="dpad" aria-label="方向控制">' +
      '        <button type="button" class="up" data-dir="up" aria-label="向上">▲</button>' +
      '        <button type="button" class="left" data-dir="left" aria-label="向左">◀</button>' +
      '        <button type="button" class="center" id="snake-pause" aria-label="暂停/继续">⏸</button>' +
      '        <button type="button" class="right" data-dir="right" aria-label="向右">▶</button>' +
      '        <button type="button" class="down" data-dir="down" aria-label="向下">▼</button>' +
      "      </div>" +
      '      <div class="snake-actions">' +
      '        <button type="button" class="mini-btn active" id="snake-auto">自动游动</button>' +
      '        <button type="button" class="mini-btn cap-btn" id="snake-capacitor" disabled>⚡ 释放电容</button>' +
      '        <button type="button" class="mini-btn" id="snake-reset">重新开始</button>' +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      // 小字说明放在游戏机下方，不写进游戏机外壳里
      '  <div class="snake-footer-legend">' +
      "    元件说明：51芯片=加速 · 32芯片=长度+2 · 书本=长度+1 · 代码=长度+1 · 数据流=10秒护盾 · 电容=储能后手动释放（3秒超速无敌） · 电阻=减速 · 电感=电磁反弹一次 · 烧坏的电路板=3秒后消失，吃到立即死亡" +
      "  </div>" +
      "</div>";

    snake = new SnakeGame({
      canvas: $("snake-canvas"),
      wrap: $("snake-wrap"),
      scoreEl: $("snake-score"),
      serialEl: $("snake-serial"),
      shieldEl: $("snake-shield"),
      energyEl: $("snake-energy"),
      effectEl: $("snake-effect"),
      autoBtn: $("snake-auto"),
      resetBtn: $("snake-reset"),
      pauseBtn: $("snake-pause"),
      capacitorBtn: $("snake-capacitor"),
      starEl: $("wisdom-star"),
      hintEl: $("wisdom-hint"),
      modeEl: $("snake-mode"),
      cardEl: $("hero-right") ? $("hero-right").querySelector(".snake-card") : null,
      config: config
    });
    snake.init();
  }

  function SnakeGame(options) {
    this.canvas = options.canvas;
    this.wrap = options.wrap;
    this.scoreEl = options.scoreEl;
    this.serialEl = options.serialEl;
    this.shieldEl = options.shieldEl;
    this.energyEl = options.energyEl;
    this.effectEl = options.effectEl;
    this.autoBtn = options.autoBtn;
    this.resetBtn = options.resetBtn;
    this.pauseBtn = options.pauseBtn;
    this.capacitorBtn = options.capacitorBtn;
    this.starEl = options.starEl;
    this.hintEl = options.hintEl;
    this.modeEl = options.modeEl;
    this.cardEl = options.cardEl;
    this.config = options.config || {};

    this.gridSize = this.config.gridSize || 17;
    this.initialSpeed = this.config.initialSpeed || 210; // 起步速度适中
    this.minSpeed = 150;  // 最快速度：只比初始快一点点，不再起飞
    this.maxSpeed = 260;  // 最慢速度
    this.speed = this.initialSpeed;
    this.serialName = this.config.serialName || "温景淇";
    this.autoPlay = this.config.autoPlay !== false;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 游戏核心状态
    this.snakeBody = [];
    this.food = { x: 0, y: 0, type: "code" };
    this.dir = "right";
    this.nextDir = "right";
    this.score = 0;
    this.alive = true;
    this.mode = this.autoPlay ? "auto" : "manual";
    this.paused = false;
    this.visible = true;
    this.timer = 0;
    this.holdTimer = 0;
    this.growPending = 0;

    // 元件皮肤效果
    this.shieldUntil = 0;          // 数据流护盾截止时间（10秒）
    this.capacitorReady = false;   // 电容是否已储能
    this.boostUntil = 0;           // 电容爆发截止时间（3秒超速+无敌）
    this.preBoostSpeed = 0;        // 爆发前速度，用于恢复
    this.reboundReady = false;     // 电感：一次电磁反弹
    this.effectText = "状态正常";
    this.effectUntil = 0;

    // 死亡 / 编号 / 成就 / 通关 / 智慧之星
    this.deathCount = 0;
    this.hasPassed = false;        // 长度是否达到 15（通关一次）
    this.firstDeathAt = 0;         // 第一次死亡的时间戳（智慧之星要求先死后通关）
    this.firstPassAt = 0;          // 第一次通关的时间戳
    this.serial = 1;               // 温景淇001号
    this.deathReason = "";
    this.deathRestartAt = 0;
    this.deathTimer = 0;
    this.deathDrawTimer = 0;
    this.deathParticles = [];
    this.deathParticleRaf = 0;
    this.achievements = this.config.achievements || [];

    // 智慧之星、死亡记录、蛇身编号：每次进入/刷新网页都从零开始，不保留历史进度
    this.wisdomLit = false;

    this.ctx = null;
    this.cell = 0;
    this.dpr = 1;
    this.observer = null;
  }

  SnakeGame.prototype.serialText = function () {
    return this.serialName + ("000" + this.serial).slice(-3) + "号";
  };

  SnakeGame.prototype.init = function () {
    const self = this;

    this.resizeCanvas();
    this.ctx = this.canvas.getContext("2d");
    this.resetGame();
    this.draw();
    this.updateStatusBar();
    this.updateWisdomStar();

    // 系统减少动态效果时：不自动游动，只做静态展示
    if (this.reduceMotion) {
      this.mode = "manual";
      this.autoBtn.textContent = "手动模式";
      this.autoBtn.classList.remove("active");
    }

    window.addEventListener("resize", this.onResize = () => {
      self.resizeCanvas();
      self.draw();
    });

    // 屏幕滑动控制
    this.wrap.addEventListener("touchstart", this.onTouchStart = (event) => {
      self.touchStart = event.touches[0];
    }, { passive: true });

    this.wrap.addEventListener("touchend", this.onTouchEnd = (event) => {
      if (!self.touchStart) return;
      const end = event.changedTouches[0];
      const dx = end.clientX - self.touchStart.clientX;
      const dy = end.clientY - self.touchStart.clientY;
      self.touchStart = null;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      self.setManualMode();
      if (Math.abs(dx) > Math.abs(dy)) self.requestDirection(dx > 0 ? "right" : "left");
      else self.requestDirection(dy > 0 ? "down" : "up");
    }, { passive: true });

    // 页面方向按钮：单击 + 长按（按钮在整张卡片里，不在画布 wrap 内）
    const cardEl = this.canvas.closest ? this.canvas.closest(".snake-card") : (this.canvas.parentElement && this.canvas.parentElement.parentElement);
    const directionBtns = cardEl ? cardEl.querySelectorAll("[data-dir]") : [];
    directionBtns.forEach((btn) => {
      btn.addEventListener("click", (event) => {
        if (event.detail !== 0) return;
        self.setManualMode();
        self.requestDirection(btn.dataset.dir);
      });
      btn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        btn.classList.add("holding");
        self.startHold(btn.dataset.dir);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((type) => {
        btn.addEventListener(type, () => {
          btn.classList.remove("holding");
          self.stopHold();
        });
      });
    });

    // 自动 / 手动切换
    this.autoBtn.addEventListener("click", () => {
      if (self.mode === "auto") {
        self.setManualMode();
      } else {
        if (!self.alive) self.resetGame();
        self.mode = "auto";
        self.updateModeUI();
        self.paused = false;
        self.pauseBtn.textContent = "⏸";
        self.startLoop();
      }
    });

    // 释放电容：手动模式下点击按钮爆发
    this.capacitorBtn.addEventListener("click", () => {
      if (self.mode === "manual") self.activateCapacitor();
    });

    // 重新开始
    this.resetBtn.addEventListener("click", () => {
      self.resetGame();
      if (self.mode === "auto") self.startLoop();
      self.draw();
    });

    // 暂停 / 继续
    this.pauseBtn.addEventListener("click", () => {
      self.paused = !self.paused;
      self.pauseBtn.textContent = self.paused ? "▶" : "⏸";
      if (!self.paused && self.mode === "auto" && self.alive) self.startLoop();
    });

    // 状态栏 250ms 刷新一次：护盾倒计时、电容、当前效果
    this.statusTimer = setInterval(() => self.updateStatusBar(), 250);

    // 蛇蛇滚出屏幕时暂停计时
    if ("IntersectionObserver" in window) {
      this.observer = new IntersectionObserver((entries) => {
        self.visible = entries[0].isIntersecting;
        self.startLoop();
      }, { threshold: 0.1 });
      this.observer.observe(this.wrap);
    }

    window.snakeOnThemeChange = () => self.draw();

    if (this.mode === "auto") this.startLoop();
  };

  SnakeGame.prototype.resizeCanvas = function () {
    const size = this.wrap.clientWidth || 320;
    // 为流畅度优先：贪吃蛇画布固定 1 倍像素，避免高分屏渲染过重
    this.dpr = 1;
    this.canvas.width = size * this.dpr;
    this.canvas.height = size * this.dpr;
    this.cell = this.canvas.width / this.gridSize;
  };

  SnakeGame.prototype.resetGame = function () {
    const mid = Math.floor(this.gridSize / 2);
    this.snakeBody = [];
    for (let i = 0; i < 4; i++) this.snakeBody.push({ x: mid - i, y: mid }); // 起始四格
    this.dir = "right";
    this.nextDir = "right";
    this.score = this.snakeBody.length;
    this.alive = true;
    this.paused = false;
    this.growPending = 0;
    this.speed = this.initialSpeed;       // 每次重启都从“比较慢”开始
    this.shieldUntil = 0;
    this.capacitorReady = false;
    this.boostUntil = 0;
    this.reboundReady = false;
    this.effectText = "状态正常";
    this.deathReason = "";
    this.deathParticles = [];
    clearTimeout(this.deathTimer);
    clearInterval(this.deathDrawTimer);
    cancelAnimationFrame(this.deathParticleRaf);
    clearTimeout(this.boostTimer);
    this.pauseBtn && (this.pauseBtn.textContent = "⏸");
    this.placeFood();
    this.updateScore();
    this.updateModeUI();
    this.updateStatusBar();
  };

  // 加权随机选择食物皮肤；allowBurnt=false 时不会抽到烧坏的电路板
  SnakeGame.prototype.rollFoodType = function (allowBurnt) {
    const includeBurnt = allowBurnt !== false;
    let total = 0;
    Object.keys(FOOD_DEFS).forEach((key) => {
      if (key === "burnt" && !includeBurnt) return;
      total += FOOD_DEFS[key].weight;
    });
    let roll = Math.random() * total;
    for (const key of Object.keys(FOOD_DEFS)) {
      if (key === "burnt" && !includeBurnt) continue;
      roll -= FOOD_DEFS[key].weight;
      if (roll <= 0) return key;
    }
    return "code";
  };

  SnakeGame.prototype.placeFood = function (allowBurnt) {
    const type = this.rollFoodType(allowBurnt);
    for (let tries = 0; tries < 600; tries++) {
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      if (!this.snakeBody.some((seg) => seg.x === x && seg.y === y)) {
        this.food = { x, y, type };
        this.foodBornAt = Date.now(); // 记录出现时间（烧坏板 3 秒后消失）
        return;
      }
    }
    this.food = { x: 0, y: 0, type };
    this.foodBornAt = Date.now();
  };

  // 烧坏的电路板：出现 3 秒后自动消失，换成一个随机新元件
  SnakeGame.prototype.checkBurntExpire = function () {
    if (!this.alive || this.food.type !== "burnt") return;
    if (Date.now() - this.foodBornAt >= 3000) {
      this.placeFood(false);
      this.setEffect("烧坏的电路板已消失，随机新元件出现", 1800);
      this.draw();
    }
  };

  SnakeGame.prototype.updateScore = function () {
    if (this.scoreEl) this.scoreEl.textContent = "长度 " + this.score;
  };

  // 进度不持久化：刷新后死亡记录、蛇身编号、智慧之星全部重置
  SnakeGame.prototype.saveProgress = function () {
    // 本函数保留为空，方便以后想重新开启存档时在这里加 localStorage
  };

  // 智慧之星：必须先死一次、再通关一次，即 firstPassAt 晚于 firstDeathAt
  SnakeGame.prototype.updateWisdomStar = function () {
    const shouldLit = this.firstDeathAt > 0 && this.firstPassAt > 0 && this.firstPassAt > this.firstDeathAt;
    if (shouldLit && !this.wisdomLit) {
      this.wisdomLit = true;
      this.saveProgress();
      showToast("🌟 智慧之星已点亮：整个网页亮度提升 30%");
    }
    if (this.wisdomLit) this.saveProgress();

    if (this.starEl) {
      this.starEl.classList.toggle("lit", this.wisdomLit);
      this.starEl.textContent = this.wisdomLit ? "★" : "☆";
    }
    if (this.hintEl) {
      this.hintEl.textContent = this.wisdomLit
        ? "智慧之星已点亮：整个网页亮度提升 30%"
        : (this.config.starHint || "点亮条件：玩家先将贪吃蛇通关失败一次，随后再通关成功一次");
    }
    // 亮度提升作用于整个网页（背景、正文、导航、目录、游戏机都变亮）
    document.documentElement.classList.toggle("wisdom-lit", this.wisdomLit);
    if (this.cardEl) {
      this.cardEl.classList.toggle("wisdom-lit", this.wisdomLit);
    }
  };

  SnakeGame.prototype.updateModeUI = function () {
    this.autoBtn.textContent = this.mode === "auto" ? "自动游动" : "手动模式";
    this.autoBtn.classList.toggle("active", this.mode === "auto");
    // 模式角标放在游戏机内部屏幕之外，不遮挡游戏画面
    if (this.modeEl) {
      this.modeEl.textContent = this.mode === "auto" ? "AI插件托管中" : "手动游玩模式";
      this.modeEl.classList.toggle("manual", this.mode === "manual");
    }
    // 电容技能只在手动模式可用
    this.capacitorBtn.disabled = this.mode !== "manual" || !this.capacitorReady;
    this.capacitorBtn.classList.toggle("ready", this.capacitorReady && this.mode === "manual");
  };

  SnakeGame.prototype.updateStatusBar = function () {
    const now = Date.now();
    if (this.serialEl) this.serialEl.textContent = this.serialText();

    // 烧坏的电路板 3 秒后自动消失
    this.checkBurntExpire();

    // 数据流护盾倒计时
    let shieldText = "🛡 护盾 --";
    if (now < this.shieldUntil) shieldText = "🛡 护盾 " + Math.ceil((this.shieldUntil - now) / 1000) + "s";
    if (this.shieldEl) this.shieldEl.textContent = shieldText;

    // 电容储能状态（爆发期间显示倒计时）
    let energyText = this.capacitorReady ? "⚡ 电容已储能" : "⚡ 电容未储能";
    if (now < this.boostUntil) energyText = "⚡ 爆发中 " + Math.ceil((this.boostUntil - now) / 1000) + "s";
    if (this.energyEl) this.energyEl.textContent = energyText;

    // 当前效果
    if (this.effectEl) {
      let effect = this.effectText;
      if (now > this.effectUntil) effect = this.alive ? "状态正常" : "已报废";
      this.effectEl.textContent = effect;
    }

    this.updateModeUI();
  };

  SnakeGame.prototype.setManualMode = function () {
    if (this.mode === "auto") {
      this.mode = "manual";
      this.stopLoop();
      this.updateModeUI();
    }
    if (!this.alive) this.resetGame();
  };

  SnakeGame.prototype.isInvincible = function () {
    const now = Date.now();
    return now < this.shieldUntil || now < this.boostUntil;
  };

  SnakeGame.prototype.opposite = function (dir) {
    return { up: "down", down: "up", left: "right", right: "left" }[dir] || dir;
  };

  // 护盾/电感触发时：不死亡，反向弹回
  SnakeGame.prototype.bounceBack = function () {
    const back = this.opposite(this.dir);
    this.dir = back;
    this.nextDir = back;
  };

  SnakeGame.prototype.requestDirection = function (dir) {
    if (this.opposite(dir) === this.dir) return;
    this.nextDir = dir;
    if (this.mode === "manual" && this.alive && !this.paused) this.tick();
  };

  SnakeGame.prototype.startHold = function (dir) {
    const self = this;
    this.stopHold();
    this.setManualMode();
    this.requestDirection(dir);
    if (!this.alive || this.paused) return;
    this.holdTimer = setInterval(() => {
      if (!self.alive || self.paused) { self.stopHold(); return; }
      self.requestDirection(dir);
    }, Math.max(120, this.speed));
  };

  SnakeGame.prototype.stopHold = function () {
    clearInterval(this.holdTimer);
    this.holdTimer = 0;
  };

  // 吃食物后的效果
  SnakeGame.prototype.applyFoodEffect = function (type) {
    const def = FOOD_DEFS[type] || FOOD_DEFS.code;
    const now = Date.now();

    switch (type) {
      case "code":
        this.growPending = 1;
        this.setEffect("代码：蛇身长度 +1", 1800);
        break;
      case "book":
        this.growPending = 1;
        this.setEffect("书本：蛇身长度 +1", 1800);
        break;
      case "chip32":
        this.growPending = 2;
        this.setEffect("32芯片：蛇身长度 +2", 1800);
        break;
      case "chip51":
        this.speed = Math.max(this.minSpeed, this.speed - 8);
        this.setEffect("51芯片：移动速度提升一点", 2200);
        this.startLoop();
        break;
      case "resistor":
        this.speed = Math.min(this.maxSpeed, this.speed + 14);
        this.setEffect("电阻：移动速度减慢了…", 2200);
        this.startLoop();
        break;
      case "data":
        this.shieldUntil = now + 10000;
        this.setEffect("数据流护盾：10 秒内免疫伤害", 3000);
        break;
      case "capacitor":
        this.capacitorReady = true;
        this.setEffect("电容已储能：手动模式按空格或点 ⚡ 释放", 2600);
        break;
      case "inductor":
        this.reboundReady = true;
        this.setEffect("电感：获得一次电磁反弹（抵挡一次死亡）", 3000);
        break;
      case "burnt":
        this.die("吃到了烧坏的电路板");
        return;
      default:
        this.growPending = 1;
        this.setEffect(def.label + "：蛇身长度 +1", 1800);
    }
    this.updateStatusBar();
  };

  SnakeGame.prototype.setEffect = function (text, ms) {
    this.effectText = text;
    this.effectUntil = Date.now() + ms;
    this.updateStatusBar();
  };

  // 释放电容：3 秒超强速度 + 无敌
  SnakeGame.prototype.activateCapacitor = function () {
    if (!this.capacitorReady || !this.alive || this.mode !== "manual") return;
    clearTimeout(this.boostTimer);
    const self = this;
    this.capacitorReady = false;
    this.preBoostSpeed = this.speed;
    this.speed = 105; // 爆发速度明显快，但不会快到失控
    this.boostUntil = Date.now() + 3000;
    this.setEffect("⚡ 电容爆发：超强速度 + 3 秒无敌！", 3000);
    this.boostTimer = setTimeout(() => {
      self.speed = self.preBoostSpeed;
      self.boostUntil = 0;
      self.setEffect("电容能量释放完毕", 1500);
      self.updateStatusBar();
    }, 3000);
    this.updateStatusBar();
  };

  SnakeGame.prototype.wouldCollide = function (head) {
    if (head.x < 0 || head.y < 0 || head.x >= this.gridSize || head.y >= this.gridSize) return true;
    const bodyToCheck = this.snakeBody.slice(0, -1);
    return bodyToCheck.some((seg) => seg.x === head.x && seg.y === head.y);
  };

  // AI：优先朝食物走，避开危险与障碍
  SnakeGame.prototype.chooseAutoDirection = function () {
    const dirs = ["up", "down", "left", "right"];
    const move = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    let best = null;
    let bestDistance = Infinity;
    for (const dir of dirs) {
      if (dir === this.opposite(this.dir)) continue;
      const head = this.snakeBody[0];
      const newHead = { x: head.x + move[dir][0], y: head.y + move[dir][1] };
      if (this.wouldCollide(newHead)) continue;
      const distance = (newHead.x - this.food.x) ** 2 + (newHead.y - this.food.y) ** 2;
      if (distance < bestDistance) { bestDistance = distance; best = dir; }
    }
    return best;
  };

  // 死亡：动画 + 提醒 + 5 秒后重启
  SnakeGame.prototype.die = function (reason) {
    if (!this.alive) return;
    this.alive = false;
    this.deathReason = reason;
    this.deathCount += 1;
    this.serial += 1;
    if (!this.firstDeathAt) this.firstDeathAt = Date.now(); // 记录第一次死亡时间
    this.stopLoop();
    this.stopHold();

    if (this.serialEl) this.serialEl.textContent = this.serialText();

    // 每死一次都保存记录（死亡次数 / 编号 / 智慧之星），刷新不丢失
    this.saveProgress();

    // 每死一次都弹一个四字成语成就（列表循环使用）
    const deathAchievements = this.achievements || [];
    if (deathAchievements.length) {
      const ach = deathAchievements[(this.deathCount - 1) % deathAchievements.length];
      pushAchievement(ach.name, ach.quote);
    }

    // 检查智慧之星是否满足点亮条件（死亡一次 + 之后通关一次）
    this.updateWisdomStar();

    showToast("💥 " + reason + "，" + this.serialText() + " 已报废");

    // 死亡爆炸粒子动画
    const head = this.snakeBody[0];
    const cx = (head.x + 0.5) * this.cell;
    const cy = (head.y + 0.5) * this.cell;
    this.deathParticles = [];
    for (let i = 0; i < 34; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2 + Math.random() * 5) * this.cell * 0.14;
      this.deathParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.018 + Math.random() * 0.022,
        color: Math.random() > 0.4 ? "#ff6b6b" : "#ffd166"
      });
    }
    this.animateDeathParticles();

    // 5 秒后自动重启（不管自动还是手动模式）
    this.deathRestartAt = Date.now() + 5000;
    this.deathTimer = setTimeout(() => {
      self_restart(this);
    }, 5000);

    // 死亡倒计时持续刷新画面
    this.deathDrawTimer = setInterval(() => {
      if (!this.alive) this.draw();
    }, 250);

    this.updateStatusBar();
    this.draw();

    function self_restart(game) {
      const modeBefore = game.mode;
      game.resetGame();
      game.draw();
      if (modeBefore === "auto") game.startLoop();
    }
  };

  SnakeGame.prototype.animateDeathParticles = function () {
    const self = this;
    cancelAnimationFrame(this.deathParticleRaf);
    let last = performance.now();
    function step(now) {
      if (self.alive) return;
      const dt = Math.min(50, now - last);
      last = now;
      self.draw();
      const ctx = self.ctx;
      const cell = self.cell;
      let anyAlive = false;
      for (const p of self.deathParticles) {
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.vy += 0.06 * cell * 0.04 * (dt / 16);
        p.life -= p.decay * (dt / 16);
        if (p.life > 0) anyAlive = true;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, cell * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (anyAlive) {
        self.deathParticleRaf = requestAnimationFrame(step);
      } else {
        self.deathParticles = [];
        self.draw();
      }
    }
    this.deathParticleRaf = requestAnimationFrame(step);
  };

  SnakeGame.prototype.tick = function () {
    if (!this.alive || this.paused) return;

    if (this.mode === "auto") {
      const autoDir = this.chooseAutoDirection();
      if (!autoDir) { this.resetGame(); return; }
      this.nextDir = autoDir;
    }

    this.dir = this.nextDir;
    const move = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const head = this.snakeBody[0];
    const newHead = { x: head.x + move[this.dir][0], y: head.y + move[this.dir][1] };

    // 碰撞处理：护盾/电容爆发/电感反弹优先，否则死亡
    if (this.wouldCollide(newHead)) {
      if (this.isInvincible()) {
        this.bounceBack();
        this.draw();
        return;
      }
      if (this.reboundReady) {
        this.reboundReady = false;
        this.bounceBack();
        this.setEffect("电感触发：电磁反弹，抵消了一次死亡！", 2200);
        this.draw();
        return;
      }
      this.die("撞毁在电路板边缘");
      return;
    }

    this.snakeBody.unshift(newHead);

    // 吃到食物
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.applyFoodEffect(this.food.type);
      this.placeFood();
    } else if (this.growPending > 0) {
      // 多格生长
      const tail = this.snakeBody[this.snakeBody.length - 1];
      for (let i = 0; i < this.growPending; i++) this.snakeBody.push({ x: tail.x, y: tail.y });
      this.growPending = 0;
    } else {
      this.snakeBody.pop();
    }

    // 正常移动后如果还有待生长（吃普通食物只生长 1，不弹尾巴）
    if (this.growPending > 0) {
      const tail = this.snakeBody[this.snakeBody.length - 1];
      for (let i = 0; i < this.growPending; i++) this.snakeBody.push({ x: tail.x, y: tail.y });
      this.growPending = 0;
    }

    this.score = this.snakeBody.length;
    this.updateScore();

    // 通关判定：长度达到配置值（默认 15）时提示通关并解锁“学海无涯”成就
    const passLength = Number(this.config.passLength || 15);
    if (this.score >= passLength) {
      const firstTimePass = !this.hasPassed;
      this.hasPassed = true;
      this.firstPassAt = Date.now(); // 更新通关时间；智慧之星要求它晚于第一次死亡
      if (firstTimePass) {
        const passAchievement = this.config.passAchievement || {};
        // 通关提示里附带当前时间，方便记录“这一刻”
        const passTime = new Date().toLocaleTimeString("zh-CN", { hour12: false });
        showToast("🏅 " + passTime + " · " + (this.config.passMessage || "恭喜通关！"));
        pushAchievement(passAchievement.name || "学海无涯", passAchievement.quote || "学宜学，深益深。    ——温景淇");
      }
      this.saveProgress();
      this.updateWisdomStar();
    }

    this.draw();
  };

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

  // ---------- 绘制：科技蛇 + 元件食物 ----------
  SnakeGame.prototype.draw = function () {
    const ctx = this.ctx;
    const size = this.canvas.width;
    const cell = this.cell;
    if (!ctx || size <= 0) return;

    ctx.clearRect(0, 0, size, size);

    // 1. 淡网格
    ctx.strokeStyle = "rgba(46, 230, 168, 0.10)";
    ctx.lineWidth = 1;
    for (let i = 1; i < this.gridSize; i++) {
      const pos = Math.round(i * cell) + 0.5;
      ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(size, pos); ctx.stroke();
    }

    // 2. 食物皮肤
    this.drawFood(ctx, cell);

    // 3. 机器蛇：蓝青金属分段，蛇身随长度逐渐变色（青 → 蓝紫渐变）
    const bodyLen = this.snakeBody.length;
    const hueStart = 190 + Math.min(1, bodyLen / 15) * 70;
    for (let i = bodyLen - 1; i >= 0; i--) {
      const seg = this.snakeBody[i];
      const x = seg.x * cell;
      const y = seg.y * cell;
      const pad = Math.max(1.5, cell * 0.10);
      const radius = cell * 0.18;
      const head = i === 0;
      const ratio = 1 - i / Math.max(1, bodyLen - 1);
      const hue = Math.round(hueStart - ratio * 45);

      // 不启用 shadowBlur：这是保持流畅的关键（每帧少几十次模糊运算）
      ctx.fillStyle = "hsl(" + hue + ", 78%, " + (head ? 56 : 45) + "%)";
      ctx.strokeStyle = "hsl(" + hue + ", 92%, 72%)";
      ctx.lineWidth = Math.max(1, cell * 0.07);
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2, radius);
      } else {
        ctx.rect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
      }
      ctx.fill();
      ctx.stroke();

      // 机器关节线：轻量一根中线即可
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = Math.max(1, cell * 0.04);
      ctx.beginPath();
      const cy = y + cell / 2;
      ctx.moveTo(x + cell * 0.25, cy);
      ctx.lineTo(x + cell * 0.75, cy);
      ctx.stroke();

      if (head) {
        // 机器蛇头部：蓝色面罩 + LED 眼睛
        const cx = x + cell / 2;
        const eyeR = Math.max(2, cell * 0.12);
        const eyeOff = cell * 0.22;
        ctx.fillStyle = "#eaffff";
        const eyePositions = {
          up: [[cx - eyeOff, cy - eyeOff], [cx + eyeOff, cy - eyeOff]],
          down: [[cx - eyeOff, cy + eyeOff], [cx + eyeOff, cy + eyeOff]],
          left: [[cx - eyeOff, cy - eyeOff], [cx - eyeOff, cy + eyeOff]],
          right: [[cx + eyeOff, cy - eyeOff], [cx + eyeOff, cy + eyeOff]]
        }[this.dir] || [[cx - eyeOff, cy], [cx + eyeOff, cy]];
        ctx.beginPath(); ctx.arc(eyePositions[0][0], eyePositions[0][1], eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyePositions[1][0], eyePositions[1][1], eyeR, 0, Math.PI * 2); ctx.fill();

        // 蛇身编号：加粗加大，保证看得清
        ctx.font = "900 " + Math.round(cell * 0.5) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "#ffffff";
        const labelY = seg.y > 0 ? y - cell * 0.12 : y + cell * 1.15;
        ctx.fillText(this.serialText(), cx, labelY);
      }
    }

    // 4. 护盾 / 电容爆发光环（轻量描边，不做模糊）
    if (this.isInvincible() && this.snakeBody.length) {
      const hx = this.snakeBody[0].x * cell + cell / 2;
      const hy = this.snakeBody[0].y * cell + cell / 2;
      ctx.save();
      ctx.strokeStyle = "rgba(127, 224, 255, 0.9)";
      ctx.lineWidth = Math.max(1.5, cell * 0.08);
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(Date.now() / 180);
      ctx.beginPath();
      ctx.arc(hx, hy, cell * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. 死亡状态：爆炸粒子结束后显示报废提醒 + 重启倒计时
    if (!this.alive) {
      const remain = Math.max(0, Math.ceil((this.deathRestartAt - Date.now()) / 1000));
      ctx.fillStyle = "rgba(5, 14, 26, 0.72)";
      ctx.fillRect(0, 0, size, size);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ff8b8b";
      ctx.font = "800 " + Math.round(cell * 0.6) + "px sans-serif";
      ctx.fillText("💥 蛇蛇已报废", size / 2, size / 2 - cell * 0.7);
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 " + Math.round(cell * 0.42) + "px sans-serif";
      ctx.fillText(this.deathReason, size / 2, size / 2);
      ctx.fillStyle = "#7fe0ff";
      ctx.font = "700 " + Math.round(cell * 0.46) + "px sans-serif";
      ctx.fillText(remain + " 秒后自动重启", size / 2, size / 2 + cell * 0.8);
      ctx.fillStyle = "#ffd166";
      ctx.font = "600 " + Math.round(cell * 0.34) + "px sans-serif";
      ctx.fillText("下一台：" + this.serialText(), size / 2, size / 2 + cell * 1.5);
    }
  };

  // 绘制元件食物皮肤：统一为圆角“元件卡”，清爽不发灰
  SnakeGame.prototype.drawFood = function (ctx, cell) {
    const def = FOOD_DEFS[this.food.type] || FOOD_DEFS.code;
    const x = this.food.x * cell;
    const y = this.food.y * cell;
    const pad = cell * 0.09;
    const w = cell - pad * 2;
    const cx = x + cell / 2;
    const cy = y + cell / 2;
    const burnt = this.food.type === "burnt";

    ctx.save();
    ctx.globalAlpha = burnt ? 0.75 + 0.25 * Math.sin(Date.now() / 150) : 0.92;

    // 柔和底色 + 彩色描边（不加 shadowBlur，保证流畅）
    ctx.fillStyle = burnt ? "#4a1010" : "rgba(10, 30, 52, 0.92)";
    ctx.strokeStyle = def.color;
    ctx.lineWidth = Math.max(1.2, cell * 0.07);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(x + pad, y + pad, w, w, cell * 0.20);
    else ctx.rect(x + pad, y + pad, w, w);
    ctx.fill();
    ctx.stroke();

    // 元件高光（左上角一小块白）
    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(x + pad + cell * 0.08, y + pad + cell * 0.08, w * 0.5, cell * 0.10, cell * 0.05);
    else ctx.rect(x + pad + cell * 0.08, y + pad + cell * 0.08, w * 0.5, cell * 0.10);
    ctx.fill();

    // 中间图标 / 元件文字
    ctx.fillStyle = burnt ? "#ffb3b3" : def.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (this.food.type === "book" || this.food.type === "code" || this.food.type === "inductor") {
      ctx.font = Math.round(cell * 0.52) + "px serif";
      ctx.fillText(def.glyph, cx, cy);
    } else {
      ctx.font = "900 " + Math.round(cell * 0.42) + "px sans-serif";
      ctx.fillText(def.glyph, cx, cy + cell * 0.02);
    }

    // 烧坏板：显示剩余消失秒数
    if (burnt) {
      const left = Math.max(0, Math.ceil(((this.foodBornAt || Date.now()) + 3000 - Date.now()) / 1000));
      ctx.font = "800 " + Math.round(cell * 0.26) + "px sans-serif";
      ctx.fillStyle = "#ffd0d0";
      ctx.fillText(left + "s", cx, y + cell * 0.82);
    }

    ctx.restore();
  };

  SnakeGame.prototype.destroy = function () {
    this.stopLoop();
    this.stopHold();
    clearInterval(this.statusTimer);
    clearTimeout(this.deathTimer);
    clearInterval(this.deathDrawTimer);
    clearTimeout(this.boostTimer);
    cancelAnimationFrame(this.deathParticleRaf);
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
      awards: SITE_CONFIG.awards,
      projects: SITE_CONFIG.projects,
      notes: SITE_CONFIG.notes,
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

  // 生成图片/视频展示块：
  //   把图片放到 assets 文件夹，配置 image: "assets/xxx.jpg"
  //   把视频放到 assets 文件夹，配置 video: "assets/xxx.mp4"
  function mediaBlock(image, video, alt) {
    let html = "";
    if (video) {
      html +=
        '<div class="media-box">' +
        '<video class="media-video" controls preload="metadata" src="' + escapeHtml(video) + '" title="' + escapeHtml(alt || "") + '"></video>' +
        "</div>";
    }
    if (image) {
      html +=
        '<div class="media-box">' +
        '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(alt || "") + '" loading="lazy" />' +
        "</div>";
    }
    return html;
  }

  /* ------------------------------------------------------------------
   * 六、渲染技能（单列：从上到下一行一个技能，每个进度条占一行）
   * ------------------------------------------------------------------ */
  function renderSkills() {
    const skills = SITE_CONFIG.skills || { items: [] };
    const grid = $("skills-grid");
    if (!grid) return;

    // 一行一个技能：名称/熟练度说明/百分比在上，进度条在下方独占一行
    grid.innerHTML =
      '<div class="skills-list">' +
      (skills.items || [])
        .map(
          (item) =>
            '<div class="skill-row reveal">' +
            '  <div class="skill-row-top">' +
            '    <span class="skill-name">' + escapeHtml(item.name) + "</span>" +
            '    <span class="skill-meta">' +
            (item.note ? '<span class="skill-note">' + escapeHtml(item.note) + "</span>" : "") +
            '    <span class="skill-percent">' + Number(item.level || 0) + "%</span>" +
            "    </span>" +
            "  </div>" +
            '  <div class="skill-bar"><div class="skill-fill" data-level="' + Number(item.level || 0) + '"></div></div>' +
            "</div>"
        )
        .join("") +
      "</div>";

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
   * 七、渲染学习经历时间线
   * ------------------------------------------------------------------ */
  function renderResearch() {
    const research = SITE_CONFIG.research || { items: [] };
    const list = $("research-list");
    if (!list) return;
    const items = research.items || [];
    if (!items.length) {
      list.innerHTML = "";
      return;
    }

    // 日记状态：开始时笔记本是合上的，点“开始阅读”/搭扣打开
    let diaryIndex = 0;
    let notebookOpen = false;

    list.innerHTML =
      '<div class="notebook-shell reveal">' +
      '  <div class="notebook" id="notebook">' +
      '    <button type="button" class="notebook-close" id="notebook-close" aria-label="合上笔记本">×</button>' +
      '    <div class="notebook-cover">' +
      '      <span class="notebook-stitch"></span>' +
      '      <div class="notebook-cover-title">学习经历</div>' +
      '      <div class="notebook-cover-subtitle">LEARNING DIARY · ' + items.length + ' PAGES</div>' +
      '      <div class="notebook-cover-hint">点击右侧搭扣或下方按钮开始阅读</div>' +
      "    </div>" +
      '    <button type="button" class="notebook-clasp" id="notebook-clasp" aria-label="打开笔记本"><span class="clasp-dot"></span></button>' +
      '    <div class="notebook-content" id="notebook-content">' +
      '      <button type="button" class="diary-edge diary-edge-left" id="diary-prev" aria-label="上一条">‹</button>' +
      '      <div class="diary-book">' +
      '        <div class="diary-page" id="diary-page">' +
      '          <div class="diary-page-left" id="diary-left"></div>' +
      '          <div class="diary-page-right" id="diary-right"></div>' +
      "        </div>" +
      '        <span class="diary-counter" id="diary-counter">1 / ' + items.length + "</span>" +
      "      </div>" +
      '      <button type="button" class="diary-edge diary-edge-right" id="diary-next" aria-label="下一条">›</button>' +
      '      <div class="diary-edge-zone diary-edge-zone-left" id="diary-zone-left" title="上一页"></div>' +
      '      <div class="diary-edge-zone diary-edge-zone-right" id="diary-zone-right" title="下一页"></div>' +
      "    </div>" +
      "  </div>" +
      '  <div class="notebook-open-wrap">' +
      '    <button type="button" class="notebook-open-btn" id="notebook-open">📖 开始阅读</button>' +
      "  </div>" +
      "</div>";

    const notebook = $("notebook");
    const openBtn = $("notebook-open");
    const closeBtn = $("notebook-close");
    const claspBtn = $("notebook-clasp");
    const leftEl = $("diary-left");
    const rightEl = $("diary-right");
    const pageEl = $("diary-page");
    const counterEl = $("diary-counter");
    const prevBtn = $("diary-prev");
    const nextBtn = $("diary-next");

    // 打开 / 合上笔记本（都有 CSS 动画）
    function setNotebookOpen(open) {
      notebookOpen = open;
      notebook.classList.toggle("open", open);
      openBtn.classList.toggle("hidden", open);
      if (openBtn.parentElement) openBtn.parentElement.classList.toggle("hidden", open);
      notebook.setAttribute("aria-expanded", open ? "true" : "false");
    }

    openBtn.addEventListener("click", () => setNotebookOpen(true));
    claspBtn.addEventListener("click", () => setNotebookOpen(true));
    closeBtn.addEventListener("click", () => setNotebookOpen(false));

    // 把一条学习经历渲染到日记本左右页
    function updateDiary() {
      const item = items[diaryIndex];

      leftEl.innerHTML =
        '<span class="diary-time">' + escapeHtml(item.time || "待填写") + "</span>" +
        '<h3 class="diary-name">' + escapeHtml(item.name || "") + "</h3>" +
        (item.role ? '<p class="diary-role">' + escapeHtml(item.role) + "</p>" : "") +
        '<p class="diary-desc">' + escapeHtml(item.desc || "") + "</p>" +
        tagRow(item.tags);

      // 右页：图片/视频可以同时存在，也可以都没有；支持多张图片
      let mediaHtml = "";
      const imageList = (item.images && item.images.length)
        ? item.images
        : (item.image ? [item.image] : []);
      imageList.forEach((src) => {
        mediaHtml +=
          '<div class="diary-media" data-media-type="image" data-media-src="' + escapeHtml(src) + '" data-media-title="' + escapeHtml(item.name) + '">' +
          '  <img src="' + escapeHtml(src) + '" alt="' + escapeHtml(item.name) + '" loading="lazy" />' +
          "</div>";
      });
      // 视频：支持多个视频（videos 数组）或单个 video
      const videoList = (item.videos && item.videos.length)
        ? item.videos
        : (item.video ? [item.video] : []);
      videoList.forEach((src) => {
        mediaHtml +=
          '<div class="diary-media" data-media-type="video" data-media-src="' + escapeHtml(src) + '" data-media-title="' + escapeHtml(item.name) + '">' +
          '  <video controls preload="metadata" src="' + escapeHtml(src) + '"></video>' +
          "</div>";
      });
      if (!mediaHtml) {
        mediaHtml = '<div class="diary-media-empty">🖼️<br />暂未上传图片或视频</div>';
      }
      rightEl.innerHTML = mediaHtml;

      counterEl.textContent = (diaryIndex + 1) + " / " + items.length;
      prevBtn.disabled = diaryIndex <= 0;
      nextBtn.disabled = diaryIndex >= items.length - 1;

      // 翻页动画：重新触发 CSS 动画
      pageEl.classList.remove("flip");
      void pageEl.offsetWidth;
      pageEl.classList.add("flip");
    }

    updateDiary();

    // 上一页 / 下一页：箭头按钮和书本左右边缘点击均可
    function goPrev() {
      if (diaryIndex > 0) { diaryIndex--; updateDiary(); }
    }
    function goNext() {
      if (diaryIndex < items.length - 1) { diaryIndex++; updateDiary(); }
    }
    prevBtn.addEventListener("click", goPrev);
    nextBtn.addEventListener("click", goNext);
    $("diary-zone-left").addEventListener("click", goPrev);
    $("diary-zone-right").addEventListener("click", goNext);

    // 点击图片/视频：全屏放大查看
    list.addEventListener("click", (event) => {
      const media = event.target.closest ? event.target.closest(".diary-media") : null;
      if (!media) return;
      openMediaLightbox(
        media.dataset.mediaType,
        media.dataset.mediaSrc,
        media.dataset.mediaTitle
      );
    });
  }

  /* ------------------------------------------------------------------
   * 七.五、渲染参加比赛及获奖情况
   * ------------------------------------------------------------------ */
  function renderAwards() {
    const awards = SITE_CONFIG.awards || { items: [] };
    const grid = $("awards-grid");
    const filterBar = $("award-filters");
    if (!grid) return;

    // 奖项分类筛选：所有奖项 / 国家级 / 省级 / 校级
    const filters = awards.filters || ["所有奖项", "国家级奖项", "省级奖项", "校级奖项"];
    if (filterBar) {
      filterBar.innerHTML = filters
        .map(
          (filter, index) =>
            '<button type="button" class="filter-chip' + (index === 0 ? " active" : "") + '" data-award-filter="' +
            escapeHtml(filter) + '">' + escapeHtml(filter) + "</button>"
        )
        .join("");
    }

    // 奖状墙：每块 = 一张奖状/证书图片 + 比赛名称 + 获得奖项
    grid.innerHTML = (awards.items || [])
      .map(
        (item) =>
          '<article class="award-plaque reveal" data-award-category="' + escapeHtml(item.category || "其他") + '">' +
          '  <div class="award-photo" data-media-type="image" data-media-src="' + escapeHtml(item.image || "assets/award-placeholder.svg") + '" data-media-title="' + escapeHtml(item.name) + '">' +
          '    <img src="' + escapeHtml(item.image || "assets/award-placeholder.svg") + '" alt="' + escapeHtml(item.name) + '" loading="lazy" />' +
          '    <span class="award-time-tag">' + escapeHtml(item.time || "") + "</span>" +
          "  </div>" +
          '  <div class="award-caption">' +
          '    <h3 class="award-name">' + escapeHtml(item.name) + "</h3>" +
          '    <p class="award-level">' + escapeHtml(item.level || "") + "</p>" +
          "  </div>" +
          "</article>"
      )
      .join("");

    // 筛选逻辑
    if (filterBar) {
      filterBar.querySelectorAll(".filter-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          filterBar.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          const filter = chip.dataset.awardFilter;
          grid.querySelectorAll(".award-plaque").forEach((plaque) => {
            let show = filter === "所有奖项";
            if (filter === "国家级奖项") show = plaque.dataset.awardCategory === "国家级";
            if (filter === "省级奖项") show = plaque.dataset.awardCategory === "省级";
            if (filter === "校级奖项") show = plaque.dataset.awardCategory === "校级";
            plaque.style.display = show ? "" : "none";
          });
        });
      });
    }

    // 点击奖状图片：全屏放大查看
    grid.addEventListener("click", (event) => {
      const photo = event.target.closest ? event.target.closest(".award-photo") : null;
      if (!photo) return;
      openMediaLightbox("image", photo.dataset.mediaSrc, photo.dataset.mediaTitle);
    });

    // 鼠标悬停奖状图片：出现浮动预览框
    let previewEl = null;
    grid.addEventListener("mouseover", (event) => {
      const photo = event.target.closest ? event.target.closest(".award-photo") : null;
      if (!photo) return;
      if (!previewEl) {
        previewEl = document.createElement("div");
        previewEl.className = "award-preview";
        document.body.appendChild(previewEl);
      }
      const plaque = photo.closest ? photo.closest(".award-plaque") : null;
      const levelEl = plaque ? plaque.querySelector(".award-level") : null;
      const level = levelEl ? levelEl.textContent : "";
      previewEl.innerHTML =
        '<img src="' + escapeHtml(photo.dataset.mediaSrc) + '" alt="奖状预览" />' +
        '<div class="award-preview-text">' +
        "  <strong>" + escapeHtml(photo.dataset.mediaTitle || "") + "</strong>" +
        (level ? "  <small>" + escapeHtml(level) + "</small>" : "") +
        "</div>";
      previewEl.classList.add("show");
    });

    grid.addEventListener("mousemove", (event) => {
      if (!previewEl || !previewEl.classList.contains("show")) return;
      const gap = 18;
      let left = event.clientX + gap;
      let top = event.clientY + gap;
      // 预览框超出屏幕时自动翻到鼠标另一侧
      const boxW = previewEl.offsetWidth || 280;
      const boxH = previewEl.offsetHeight || 230;
      if (left + boxW > window.innerWidth - 10) left = event.clientX - boxW - gap;
      if (top + boxH > window.innerHeight - 10) top = event.clientY - boxH - gap;
      previewEl.style.left = Math.max(10, left) + "px";
      previewEl.style.top = Math.max(10, top) + "px";
    });

    grid.addEventListener("mouseout", (event) => {
      const photo = event.target.closest ? event.target.closest(".award-photo") : null;
      if (!photo && previewEl) previewEl.classList.remove("show");
    });
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
        mediaBlock("", project.video, project.title) +
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
   * 八.五、渲染我的笔记
   * ------------------------------------------------------------------ */
  function renderNotes() {
    const notes = SITE_CONFIG.notes || { items: [] };
    const grid = $("notes-grid");
    if (!grid) return;

    grid.innerHTML = (notes.items || [])
      .map((note) => {
        const hasLink = note.link && note.link !== "#";
        return (
          '<article class="note-card glass-card reveal">' +
          '  <div class="note-top">' +
          '    <span class="note-category">' + escapeHtml(note.category || "笔记") + "</span>" +
          '    <span class="note-date">' + escapeHtml(note.date || "") + "</span>" +
          "  </div>" +
          '  <h3 class="note-title">' + escapeHtml(note.title) + "</h3>" +
          '  <p class="note-summary">' + escapeHtml(note.summary || "") + "</p>" +
          mediaBlock(note.image, note.video, note.title) +
          (hasLink ? '<div class="project-actions"><a class="link-btn" href="' + escapeHtml(note.link) + '" target="_blank" rel="noopener">📖 阅读笔记</a></div>' : "") +
          "</article>"
        );
      })
      .join("");
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

  /* ---- 通用媒体全屏预览：日记本图片/视频点击放大 ---- */
  function openMediaLightbox(type, src, title) {
    const box = $("media-lightbox");
    const img = $("media-lightbox-img");
    const video = $("media-lightbox-video");
    if (!box) return;

    if (type === "video") {
      video.src = src;
      video.hidden = false;
      img.hidden = true;
      img.removeAttribute("src");
    } else {
      img.src = src;
      img.alt = title || "";
      img.hidden = false;
      video.hidden = true;
      video.pause();
      video.removeAttribute("src");
    }
    $("media-lightbox-caption").textContent = title || "";
    box.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeMediaLightbox() {
    const box = $("media-lightbox");
    const video = $("media-lightbox-video");
    if (!box) return;
    box.hidden = true;
    if (video) {
      video.pause();
      video.removeAttribute("src");
    }
    $("media-lightbox-img").removeAttribute("src");
    document.body.style.overflow = "";
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

    // 1.5 左侧银河目录：展开 / 收起
    const tocToggle = $("toc-toggle");
    const tocPanel = $("toc-panel");
    const tocClose = $("toc-close");

    function setTocOpen(open) {
      tocPanel.classList.toggle("open", open);
      tocToggle.classList.toggle("open", open);
      tocToggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    tocToggle.addEventListener("click", () => {
      setTocOpen(!tocPanel.classList.contains("open"));
    });

    tocClose.addEventListener("click", () => setTocOpen(false));

    // 点击目录里的版块链接后：跳转并收起面板（移动端不挡内容）
    tocPanel.querySelectorAll(".toc-link").forEach((link) => {
      link.addEventListener("click", () => setTocOpen(false));
    });

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

    // 4. 当前版块高亮（滚动到哪个 section，顶部导航和左侧银河目录对应项都亮起）
    const allNavItems = document.querySelectorAll("[data-nav-id]");
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
              allNavItems.forEach((item) => {
                item.classList.toggle("active", item.dataset.navId === id);
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

    // 5.5 日记本媒体全屏预览
    $("media-lightbox-close").addEventListener("click", closeMediaLightbox);
    $("media-lightbox").addEventListener("click", (event) => {
      if (event.target === $("media-lightbox")) closeMediaLightbox();
    });

    document.addEventListener("keydown", (event) => {
      // 通用媒体预览打开时：Esc 关闭
      const mediaBox = $("media-lightbox");
      if (mediaBox && !mediaBox.hidden) {
        if (event.key === "Escape") closeMediaLightbox();
        return;
      }

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

      // 空格：手动模式下释放电容技能（超强速度 + 3 秒无敌）
      if ((event.code === "Space" || event.key === " ") && snake.visible) {
        event.preventDefault();
        snake.setManualMode();
        snake.activateCapacitor();
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
