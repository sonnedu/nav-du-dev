# Nav-Du

A lightweight, responsive personal navigation page (bookmarks dashboard).
It supports priority search (name > description > URL) with pinyin + initials, theme toggle, a favicon proxy, and a small admin backend for managing links and categories.

- Primary docs (中文): `README.md`

## Features

- Category sidebar + card grid
- Search: name/url/desc + pinyin + initials + fuzzy matching
- Light/Dark/System theme
- Scroll-to-top with progress ring
- Favicon proxy (same-origin `/ico` recommended)
- Admin backend: add/edit/delete links, manage categories and groups, import/export config

## Quick start

```bash
npm install
npm run dev
```

Open: `http://127.0.0.1:5173`

Note: `npm run dev` only starts Vite. Cloudflare Pages Functions (`/api/*`) are not executed by Vite.

## One-command local stack (recommended)

Starts: Vite + Pages Functions + favicon Worker.

Note: `dev:all` binds a local KV namespace (`--kv NAV_CONFIG_KV`) and persists to `.wrangler/state` for production-like behavior.

```bash
npm run dev:all
```

Default ports:
- Vite UI: `http://127.0.0.1:5173`
- Pages (API/Admin): `http://127.0.0.1:8799`
- Favicon Worker: `http://127.0.0.1:8787` (endpoint: `/ico?url=...`)

Override ports via env: `NAV_VITE_PORT` / `NAV_PAGES_PORT` / `NAV_FAVICON_PORT`.

## Production-like local preview (dist)

To see production-like network behavior (no `src/*.ts` module requests), serve the built output with Pages dev:

```bash
npm run build
npx wrangler pages dev dist --kv NAV_CONFIG_KV --persist-to .wrangler/state
```

## Local dev admin credentials

For security, the admin must be configured via env vars in production. For local development, you can opt into a default credential.

Requirements:
- Inject via Wrangler binding: `-b ALLOW_DEV_DEFAULT_ADMIN=1`
- Must be accessed via localhost

Default: `dev / dev2026`

Optional overrides:
- `DEV_ADMIN_USERNAME`
- `DEV_ADMIN_PASSWORD`
- `DEV_SESSION_SECRET`

## Configuration

Default config file: `src/data/nav.yaml`

### `site.*`

- `site.title`: site title
- `site.sidebarTitle`: sidebar title
- `site.bannerTitle`: banner title
- `site.description`: optional description
- `site.defaultTheme`: `light | dark | system`
- `site.timeZone`: IANA timezone, default `Asia/Shanghai`
- `site.sidebarAvatarSrc`: avatar URL, e.g. `/avatar/avatar.jpg`
- `site.faviconProxyBase`: favicon proxy base
  - recommended same-origin: `/ico`
  - or absolute: `https://your-domain.com/ico`
- `site.adminPath`: admin path prefix (default `/admin`)

### Frontend env overrides (`VITE_*`)

- `VITE_SIDEBAR_TITLE`
- `VITE_BANNER_TITLE`
- `VITE_TIME_ZONE`
- `VITE_SIDEBAR_AVATAR_SRC`
- `VITE_FAVICON_PROXY_BASE` (use `/ico` or `https://.../ico`)
- `VITE_ADMIN_PATH` (default `/admin`)

### Pages Functions env vars

Required (production):
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_SHA256` (SHA-256 hex, lowercase)
- `SESSION_SECRET`

Optional:
- `SESSION_TTL_SECONDS` (default 86400)
- `NAV_CONFIG_KV` (required for saving config via admin)

Brute-force mitigation (optional, uses `NAV_CONFIG_KV`):
- `LOGIN_RATE_LIMIT_WINDOW_SECONDS` (default 60)
- `LOGIN_RATE_LIMIT_MAX_FAILS` (default 8)
- `LOGIN_RATE_LIMIT_LOCK_SECONDS` (default 300)

Generate `ADMIN_PASSWORD_SHA256` (macOS / Linux):

```bash
printf '%s' 'your-password' | shasum -a 256 | awk '{print $1}'
```

## i18n

- Default: `zh-CN`
- Supported: `zh-CN` / `en`
- Switch:
  - Query param: `?lang=en` / `?lang=zh-CN`
  - Or localStorage: `nav-du/locale = 'en' | 'zh-CN'`

## Deploy on Cloudflare

Recommended architecture:
- Cloudflare Pages: static site + Pages Functions (`functions/api/*`)
- Cloudflare Worker: favicon proxy (`workers/favicon`) mounted at same-origin `/ico`

Steps:
1) Deploy Pages (build output: `dist/`).
2) Deploy favicon Worker and add a route: `nav.du.dev/ico*`.
3) Configure `VITE_FAVICON_PROXY_BASE=/ico` (recommended) or `site.faviconProxyBase: "/ico"`.
4) Verify favicon requests go to `https://nav.du.dev/ico?url=...`.
