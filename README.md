# 🧭 Nav-Du

一个轻量、响应式的个人导航页（收藏夹 Dashboard）✨。

支持 **搜索**（拼音/拼音缩写/模糊匹配）、**主题切换** 🌗、**Favicon 代理** 🚀，以及一个功能强大的 **管理后台** 🛠️ 用于维护链接与分类。

- 🌐 **默认语言**：中文（简体）
- 📄 **English docs**: `README.en.md`

## ✨ 功能特性

- 📱 **响应式设计**：左侧分类菜单 + 右侧卡片网格，完美适配移动端与桌面端。
- 🔍 **智能搜索**：支持 名称/网址/描述 + 拼音/拼音缩写 + 模糊匹配（按优先级：名称 > 描述 > URL）。
- 🎨 **主题系统**：支持 浅色 / 深色 / 跟随系统 自动切换。
- 🚀 **Favicon 代理**：内置 Cloudflare Worker 代理（`/ico`），解决中国大陆访问 Google favicon 服务不稳定的问题。
- 🛠️ **管理后台**：
  - 📝 **可视化编辑**：添加/编辑/删除链接，拖拽排序分类与分组。
  - 📂 **分类管理**：支持自定义 Emoji 图标、拖拽调整顺序。
  - 💾 **云端同步**：配置支持 KV 存储，数据持久化。
  - 📤 **导入/导出**：方便备份与迁移。
- ⬆️ **交互优化**：返回顶部（带滚动进度环）、平滑滚动。

## 🚀 快速开始（本地）

```bash
npm install
npm run dev
```

打开：`http://127.0.0.1:5173`

> ⚠️ 说明：`npm run dev` 只启动 Vite，不会运行 Cloudflare Pages Functions（`/api/*`）。

## ⚡ 一键启动本地全栈（推荐）

同时启动：**Vite** + **Pages Functions** + **Favicon Worker**（用于本地验证后台与 `/ico`）。

> 💡 说明：`dev:all` 会为 Pages dev 绑定一个本地 KV（`--kv NAV_CONFIG_KV`，并使用 `.wrangler/state` 持久化），以便行为更接近生产。

```bash
npm run dev:all
```

**默认端口**：
- 🏠 **页面（Vite）**：`http://127.0.0.1:5173`
- ⚙️ **Pages（API/后台）**：`http://127.0.0.1:8799`
- 🖼️ **Favicon Worker**：`http://127.0.0.1:8787`（接口：`/ico?url=...`）

可通过环境变量修改端口：`NAV_VITE_PORT` / `NAV_PAGES_PORT` / `NAV_FAVICON_PORT`。

## 🏗️ 生产一致本地模拟（dist）

如果你只想看生产环境的请求形态（没有 `src/*.ts` 请求），直接用构建产物启动 Pages：

```bash
npm run build
npx wrangler pages dev dist --kv NAV_CONFIG_KV --persist-to .wrangler/state
```

## 🔐 后台登录（本地开发默认账号）

默认情况下，后台必须配置线上管理员账号/密码（见下文）。为了方便本地开发，支持显式开启默认账号。

**启用条件**：
- 必须通过 Wrangler binding 注入：`-b ALLOW_DEV_DEFAULT_ADMIN=1`
- 必须在 localhost（`127.0.0.1` / `localhost` / `::1`）访问

**默认账号密码**：
- 👤 用户名：`dev`
- 🔑 密码：`dev2026`

可选覆盖：`DEV_ADMIN_USERNAME`, `DEV_ADMIN_PASSWORD`, `DEV_SESSION_SECRET`。

## ⚙️ 配置说明

默认配置文件：`src/data/nav.yaml`

### 站点配置（`site`）

- `site.title`：站点标题（浏览器标题等）
- `site.sidebarTitle`：侧栏标题
- `site.bannerTitle`：右侧 Banner 标题
- `site.description`：站点描述（可选）
- `site.defaultTheme`：`light | dark | system`
- `site.timeZone`：时区字符串，默认 `Asia/Shanghai`
- `site.sidebarAvatarSrc`：侧栏头像地址（例如 `/avatar/avatar.jpg`）
- `site.faviconProxyBase`：favicon 代理基地址
  - 推荐同域：`/ico`
  - 也支持绝对地址：`https://your-domain.com/ico`
- `site.adminPath`：后台入口路径（默认 `/admin`）

### 环境变量覆盖（前端，`VITE_*`）

以下会覆盖 `site.*`（适合部署时配置）：
- `VITE_SIDEBAR_TITLE`
- `VITE_BANNER_TITLE`
- `VITE_TIME_ZONE`
- `VITE_SIDEBAR_AVATAR_SRC`
- `VITE_FAVICON_PROXY_BASE`（推荐：`/ico` 或 `https://.../ico`）
- `VITE_ADMIN_PATH`（默认 `/admin`）

### 后台环境变量（Pages Functions）

**必须配置（线上）**：
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_SHA256`：管理员密码的 SHA-256 hex（小写）
- `SESSION_SECRET`：会话签名密钥（随机长字符串）

**可选**：
- `SESSION_TTL_SECONDS`：会话有效期（秒），默认 86400
- `NAV_CONFIG_KV`：用于存储云端配置（管理后台保存/重置依赖）

**登录防暴力**（可选，默认启用；依赖 `NAV_CONFIG_KV` 才能做计数）：
- `LOGIN_RATE_LIMIT_WINDOW_SECONDS`（默认 60）
- `LOGIN_RATE_LIMIT_MAX_FAILS`（默认 8）
- `LOGIN_RATE_LIMIT_LOCK_SECONDS`（默认 300）

**生成 `ADMIN_PASSWORD_SHA256`（macOS / Linux）**：

```bash
printf '%s' 'your-password' | shasum -a 256 | awk '{print $1}'
```

## 🌍 国际化（i18n）

- 默认：中文（简体）
- 支持：`zh-CN` / `en`
- 切换方式：
  - URL 参数：`?lang=en` 或 `?lang=zh-CN`
  - 或写入 localStorage：`nav-du/locale = 'en' | 'zh-CN'`

说明：当前仅对 UI 文案做国际化；`src/data/nav.yaml` 中的分类名/描述仍属于数据内容。

## ☁️ 部署（Cloudflare）

推荐架构：
- **Cloudflare Pages**：部署前端静态站点 + Pages Functions（`functions/api/*`）
- **Cloudflare Worker**：部署 favicon 代理（`workers/favicon`），并通过同域路由 `/ico` 提供服务

### 1) 部署 Pages（主站）

构建输出：`dist/`（`npm run build`）。

### 2) 部署 favicon Worker 并绑定 `/ico`

- 部署 `workers/favicon`
- 为 Worker 添加路由：`nav.du.dev/ico*`
- 配置前端使用同域 `/ico`：
  - 推荐：Pages 环境变量 `VITE_FAVICON_PROXY_BASE=/ico`
  - 或配置 `site.faviconProxyBase: "/ico"`

### 3) 验证

打开站点后，DevTools Network 中 favicon 请求应为：`https://nav.du.dev/ico?url=...`（而不是 `google.com/s2/...`）。
