# Agent Guide (nav-du-dev)

For agentic coding assistants operating in this repository.

## Repo overview

- **Frontend**: Vite + React + TypeScript
- **Backend/API**: Cloudflare Pages Functions under `functions/` (routes like `/api/*`)
- **Favicon proxy**: Cloudflare Worker under `workers/favicon/` (Wrangler)
- **Data Source**: YAML-based configuration (`src/data/nav.yaml`) with runtime overrides via KV.

### Key paths
- UI Source: `src/`
- Data Config: `src/data/nav.yaml` (Schema in `src/lib/navTypes.ts`)
- E2E tests: `e2e/` (Playwright)
- Pages Functions (API): `functions/api/`
- Worker entry: `workers/favicon/src/index.ts`

### Config files
- ESLint: `eslint.config.js`
- Playwright: `playwright.config.ts`
- TypeScript: `tsconfig.app.json` (Strict), `tsconfig.node.json`
- Pages (local): `wrangler.toml` (Build output: `dist/`)
- Worker (favicon): `workers/favicon/wrangler.toml`

## Commands

**Package Manager**: `npm` (use `package-lock.json`)

### Development
- **Frontend Only**: `npm run dev`
  - Starts Vite server only.
  - API calls to `/api/*` will 404.
- **Full Stack (Recommended)**: `npm run dev:all`
  - Builds frontend, starts Pages dev (API/KV) + Favicon Worker + Vite proxy.
  - Essential for testing Admin/API features.
  - Ports: Vite(5173), Pages(8799), Worker(8787).

### Build & Verification
- **Build**: `npm run build`
  - Runs `tsc -b` and `vite build`. Outputs to `dist/`.
- **Lint**: `npm run lint`
  - Uses ESLint (Flat Config).
- **Typecheck**:
  - App: `npx tsc -p tsconfig.app.json --noEmit`
  - Worker: `npm run worker:favicon:typecheck`

### E2E Tests (Playwright)
**Note**: This project relies on E2E tests. There are **NO** unit tests (Jest/Vitest).

- **Install Browsers**: `npx playwright install`
- **Run All**: `npm run test:e2e`
- **Run Chromium**: `npm run test:e2e:chromium`
- **Targeted Run**:
  - File: `npx playwright test e2e/nav.spec.ts`
  - Test Name: `npx playwright test -g "theme toggle"`
- **Debug**: `npx playwright test --debug`

### Worker (Favicon)
- **Dev**: `npm run worker:favicon:dev`
- **Deploy**: `npm run worker:favicon:deploy`

## Architecture & Data Flow

1.  **Data Loading**:
    - App loads `nav.yaml` at build time (or runtime via import).
    - `useNavConfig` hook fetches overrides from `/api/config` (stored in KV).
    - **Priority**: KV Override > `nav.yaml` Default.

2.  **State Management**:
    - **No global store** (Redux/Zustand/Context Providers).
    - Uses **React Hooks** (`useNavConfig`, `useThemeMode`) and local state.
    - Data passing via props.

3.  **Styling**:
    - **Standard CSS**.
    - Imports: `App.css`, `index.css`, `pages/*.css`.
    - **No Tailwind** or CSS-in-JS libraries.

## Code Style Guidelines

### TypeScript
- **Strict Mode**: Enabled (`strict: true`).
- **No `any`**: Use `unknown` and narrow types.
- **No Type Suppression**: Avoid `@ts-ignore`, `as any`.
- **Imports**:
  - Use `import type` for type-only imports.
  - Verbatim Module Syntax is enabled.

### Formatting
- **No Prettier/Biome**.
- Indentation: **2 spaces**.
- Quotes: Single quotes preferred.
- Semicolons: Always.
- Minimize diff noise (respect existing formatting).

### Naming Conventions
- **Components**: `PascalCase` (e.g., `NavPage.tsx`)
- **Hooks**: `camelCase` (e.g., `useNavConfig.ts`)
- **Functions/Vars**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE` (module level)
- **Types**: `PascalCase`

### Error Handling
- **Frontend**:
  - Catch errors in data fetching hooks.
  - Fail gracefully (e.g., fallback to default config).
- **API (Functions)**:
  - Use `functions/api/_util.ts` helpers (`jsonResponse`).
  - Return explicit HTTP 4xx/5xx codes.
- **Worker**:
  - Defend against SSRF (validate protocols/hostnames).

## Security & Secrets
- **No `.env` files** committed.
- **Secrets**: Managed via Cloudflare Pages environment variables.
- **Admin Auth**: Rely on backend validation (Session/KV).

## Agent Rules
- **No Cursor/Copilot rules found**.
- **Test First**: Check `npm run test:e2e` before major changes.
- **Verify**: Always run `npm run lint` and `npm run build` after edits.
- **Frontend Files**: If modifying UI logic, check `App.tsx` and `pages/`.
- **Backend Files**: API logic is in `functions/api/`. Be careful with KV logic.

## Verification Checklist
1. `npm run lint` (Must pass)
2. `npm run build` (Must pass)
3. `npm run test:e2e:chromium` (Must pass key flows)
4. If modifying Worker: `npm run worker:favicon:typecheck`
5. If modifying API: Verify with `npm run dev:all` manually if possible, or trust E2E.
