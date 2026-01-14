# nav.du.dev

一个简洁、响应式的个人常用网站导航页 ✨

- 🗂️ 单层分类 + 卡片网格
- 🔎 搜索：名称/链接/说明 + 拼音/拼音缩写 + 模糊匹配（`pinyin-pro` + `Fuse.js`）
- 🌓 主题：浅色/深色/跟随系统，一键切换
- ⬆️ 右下角按钮组：主题切换 + 返回顶部（带滚动进度环）
- 🛠️ 管理后台（`/admin`）：添加/编辑/导入/导出/重置（账号密码登录）
- 🧩 favicon 代理：Worker 兜底防盗链/跨域/偶发失败

设计与实现说明见：`DESIGN.md`。

---

## 🚀 本地开发

```bash
npm install
npm run dev
```

打开：`http://127.0.0.1:5173`（Vite 默认端口）。

## ✅ 本地验证（手动）

### 1) 验证前端 UI（推荐先做）

- 电脑端：直接在浏览器打开 `http://127.0.0.1:5173`
- Pad/手机端：用浏览器开发者工具切换响应式设备（如 iPhone 14、iPad Pro 11）

建议快速检查：
- 🧭 桌面端左侧菜单固定，右侧内容滚动
- 📱 移动端抽屉菜单打开/关闭、遮罩可关闭
- 🔎 搜索输入/清空切换正常
- 🌓 主题切换后 `html[data-theme]` 变化

### 2) 本地验证 `/api/*`（管理后台登录需要）

仅 `npm run dev` 不会执行 Pages Functions。要在本地跑 `/api/*`：

- 终端 A：`npm run dev`（保持运行）
- 终端 B：

```bash
npx wrangler pages dev --proxy 5173
```

然后用 Wrangler 输出的本地地址访问（包含 `/api/*` 路由）。

提示：
- 可在项目根目录创建 `.dev.vars`（已加入 `.gitignore`）配置本地登录所需环境变量：
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD_SHA256`
  - `SESSION_SECRET`
  - `SESSION_TTL_SECONDS`（可选）
- 若要验证“云端配置 KV”读写，需要在 Wrangler/Pages 项目中配置 `NAV_CONFIG_KV` 绑定。

## 🧪 自动化校验（Playwright E2E）

首次安装浏览器（只需一次）：
```bash
npx playwright install
```

运行 E2E：
```bash
npm run test:e2e          # 全矩阵：Chromium/Firefox/WebKit + iPhone/iPad
npm run test:e2e:chromium # 快速：仅 Chromium（更接近 Chrome/Edge）
```

跑单个测试文件/用例：
```bash
npx playwright test e2e/nav.spec.ts
npx playwright test -g "theme toggle"
```

## 🧾 配置数据

默认配置文件：`src/data/nav.yaml`

运行时行为：
- 页面启动会加载 `src/data/nav.yaml`
- 如果 `localStorage` 存在导入/编辑后的配置，会覆盖默认配置
- 右上角“重置”会清除本地覆盖配置并回到 `src/data/nav.yaml`

## ☁️ 部署（Cloudflare Pages）

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- 绑定域名：`nav.du.dev`

### 🔐 管理后台（/admin）

管理后台路径：`/admin`

Cloudflare Pages 项目里需要设置以下环境变量（Secrets）：
- `ADMIN_USERNAME`：管理员账号
- `ADMIN_PASSWORD_SHA256`：管理员密码的 SHA-256 hex（小写）
- `SESSION_SECRET`：会话签名密钥（随机长字符串）
- `SESSION_TTL_SECONDS`（可选）：会话有效期，默认 86400

说明：
- `ADMIN_PASSWORD_SHA256` 是对“纯密码字符串”做 SHA-256（不是用户名+密码）。
- 本地开发如果要验证登录，需要用 `wrangler pages dev`（Pages Functions 才会生效）。

## 🧩 favicon 代理（Cloudflare Workers）

前端会从环境变量读取 favicon 代理地址：
- `VITE_FAVICON_PROXY_BASE`（例：`https://favicon.du.dev/ico`）
- 不设置则默认使用：`https://favicon.du.dev/ico`

Worker 代码在：`workers/favicon`。

### 本地调试（推荐）

终端 1：启动 Worker
```bash
npm run worker:favicon:typecheck
npm run worker:favicon:dev
```

终端 2：启动前端并指向本地 Worker（wrangler 默认端口 8787）
```bash
VITE_FAVICON_PROXY_BASE="http://127.0.0.1:8787/ico" npm run dev
```

### 部署

```bash
npm run worker:favicon:deploy
```

### KV 绑定（可选但推荐）

`workers/favicon/src/index.ts` 支持绑定 KV（用于缓存解析出来的 favicon URL 元信息）。
在 Cloudflare Dashboard 创建 KV 后，将绑定添加到 `workers/favicon/wrangler.toml`。

## 🔗 GitHub

仓库：`github.com/sonnedu/nav-du-dev`
