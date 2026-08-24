# 个人学术主页（GitHub Pages 版）

科技风 · 全站星空背景 · 地球光标 · 响应式个人学术主页。

功能包含：个人简历（基本信息 / 技能单列进度条 / 学习经历）、银河跳转目录、项目成果展示及资料、比赛及获奖、我的笔记、社交链接、贪吃蛇装饰小游戏、明暗主题切换、不蒜子访问量统计、光影瞬间照片墙、照片灯箱、移动端适配。星空背景固定覆盖所有版块：鼠标静止时自动流动，鼠标移动时跟随视角变化。

---

## 一、本地预览（二选一）

1. **最简单**：直接双击 `index.html` 即可在浏览器打开（所有脚本均为普通加载，不依赖本地服务器）。
   - 注：Three.js 与访问量统计需要联网；若网络不通，星点背景会自动降级为 2D 星空，其余功能不受影响。
2. **推荐（更接近线上效果）**：用 VS Code 安装 Live Server 插件，右键 `index.html` → Open with Live Server。

## 二、修改内容（最重要的一步）

打开 **`js/config.js`**，按其中的中文注释修改即可，全部可替换内容都集中在这一个文件里：

| 想改什么 | 去哪里改 |
|---|---|
| 姓名、专业、兴趣爱好、简介 | `SITE_CONFIG.hero`、`SITE_CONFIG.about` |
| 社交链接（GitHub / QQ / 邮箱 / B站） | `SITE_CONFIG.hero.socials`、`SITE_CONFIG.contact` |
| 技能名称与熟练度（进度条） | `SITE_CONFIG.skills.items` |
| 学习经历 / 教育经历 | `SITE_CONFIG.research`、`SITE_CONFIG.education` |
| 项目列表与 GitHub 仓库链接 | `SITE_CONFIG.projects` |
| 比赛及获奖情况 | `SITE_CONFIG.awards` |
| 我的笔记 | `SITE_CONFIG.notes` |
| 银河目录版块与天体图标 | `SITE_CONFIG.nav.links` |
| 照片墙图片 | `SITE_CONFIG.gallery` |
| 主题、统计开关、ICP 备案号 | `SITE_CONFIG.defaultTheme`、`SITE_CONFIG.footer` |
| 贪吃蛇速度 / 是否自动游动 | `SITE_CONFIG.snake` |

所有图片放入 `assets/` 文件夹，再把 `config.js` 中的路径改为文件名即可。

## 三、部署到 GitHub Pages

### 方式 A：项目主页（适合个人网站仓库）

1. 在 GitHub 新建仓库，例如 `my-homepage`。
2. 把本目录的全部文件上传（可拖拽上传，或用 Git）：
   ```bash
   git init
   git add .
   git commit -m "初始化个人学术主页"
   git branch -M main
   git remote add origin https://github.com/你的用户名/my-homepage.git
   git push -u origin main
   ```
3. 打开仓库页面 → **Settings** → 左侧 **Pages**。
4. Source 选择 **Deploy from a branch**，Branch 选 `main`，目录选 `/ (root)`，点 Save。
5. 稍等 1~2 分钟，访问：
   `https://你的用户名.github.io/my-homepage/`

### 方式 B：个人主页（直接用用户名域名）

1. 新建仓库，**仓库名必须叫**：`你的用户名.github.io`（例如 `jingqiwen.github.io`）。
2. 上传全部文件，Settings → Pages 选择 `main` 分支根目录。
3. 访问：`https://你的用户名.github.io/`，无需再加路径。

## 四、常见问题

### 1. 打开页面一片空白？
- 按 F12 打开控制台查看报错，多半是 `config.js` 被改坏（缺逗号 / 引号）。
- 检查文件名与路径是否和 `index.html` 中引用的一致。

### 2. Three.js 粒子背景不显示？
- 检查网络是否能访问 `cdn.jsdelivr.net`。无法访问时页面会自动降级为 2D 星空，不影响使用。
- 如需完全离线：到 threejs.org 下载 `three.min.js` 放入 `js/`，再把 `index.html` 中 CDN 地址改为 `js/three.min.js` 即可。

### 3. 访问量统计不显示？
- “不蒜子”统计需要联网，并只能统计线上部署后的真实访问；本地打开时不会计数。
- 在 `config.js` 中把 `footer.statsEnabled` 改为 `false` 即可关闭。

### 4. 想关闭贪吃蛇？
- 在 `config.js` 中把 `snake.enabled` 改为 `false`。

### 5. 想换照片？
- 把照片放进 `assets/`，修改 `config.js` 中 `gallery.photos` 的 `src` 路径。
- 建议照片压缩到 300KB 以内，加载更快。

## 五、目录结构

```
├── index.html          # 页面结构
├── css/
│   └── style.css       # 全部样式（浅色/深色双主题）
├── js/
│   ├── config.js       # ★ 全站内容配置（你只需改这里）
│   ├── three-bg.js     # 天空柔和星点背景（自动降级）
│   └── main.js         # 渲染与交互逻辑
├── assets/             # 头像、图标、照片、项目封面
└── README.md           # 本说明文档
```

祝部署顺利！
