# Agent Guide (nav-du-dev)

This file is for agentic coding assistants operating in this repository.

## Repo overview

- Frontend: Vite + React + TypeScript
- Static hosting + backend: Cloudflare Pages + Pages Functions in `functions/`
- Favicon proxy: Cloudflare Worker in `workers/favicon/` (Wrangler)

Key paths:
- UI: `src/`
- Pages Functions (API): `functions/api/`
- Worker: `workers/favicon/src/index.ts`

## Commands (build / lint / typecheck / dev)

Package manager:
- Uses npm (`package-lock.json` is present)

Install:
- `npm install`
- CI-style install: `npm ci`

Frontend dev:
- `npm run dev` (Vite dev server)
- `npm run preview` (preview built `dist/`)

Build:
- `npm run build`
  - Runs `tsc -b` (project references) and `vite build`

Lint:
- `npm run lint` (runs ESLint on the repository)

Typecheck (no dedicated top-level script):
- App typecheck (manual): `npx tsc -p tsconfig.app.json --noEmit`
- Tooling typecheck (manual): `npx tsc -p tsconfig.node.json --noEmit`

Favicon worker:
- Typecheck: `npm run worker:favicon:typecheck`
- Local dev: `npm run worker:favicon:dev`
- Deploy: `npm run worker:favicon:deploy`

### Running tests (E2E)

- E2E test runner: Playwright (`@playwright/test`)
- Install browsers once (downloads Chromium/Firefox/WebKit): `npx playwright install`

Run all E2E (multi-browser + multi-viewport projects):
- `npm run test:e2e`

Run only Chromium desktop (fast path):
- `npm run test:e2e:chromium`

Run a single test file:
- `npx playwright test e2e/nav.spec.ts`

Run a single test by name:
- `npx playwright test -g "theme toggle"`

### Running lint/typecheck on one file

ESLint single file:
- `npx eslint src/lib/navLoad.ts`
- `npx eslint "workers/favicon/src/index.ts"`

TypeScript is project-based, not per-file:
- App: `npx tsc -p tsconfig.app.json --noEmit`
- Worker: `npx tsc -p workers/favicon/tsconfig.json --noEmit`

## Cloudflare Pages Functions (local)

Pages Functions live under `functions/` (routes like `/api/login`, `/api/config`, etc.).

- Note: `npm run dev` runs Vite only; Pages Functions are not executed under plain Vite.
- For local testing of `/api/*`, use Wrangler Pages dev.

Common workflow (verify with `npx wrangler pages dev --help` for flags):
- Terminal A: `npm run dev` (Vite, usually `:5173`)
- Terminal B: `npx wrangler pages dev --proxy 5173` (serve Pages + run Functions, proxying to Vite)

Alternative workflow:
- `npm run build` then `npx wrangler pages dev dist`

## Code style and conventions

This repo is mostly TypeScript + React, with strict compiler settings.

### TypeScript

- Strict mode is enabled (`strict: true`). Do not weaken type safety.
- Prefer `unknown` for untrusted data, then validate.
  - Pattern used in API: `isRecord` / `isString` / `isNavConfig` style guards before use.
- Avoid `any`. If unavoidable, prefer narrowing from `unknown` and writing a type guard.
- Use `import type { ... }` for type-only imports.
- Avoid large refactors while fixing a bug; keep diffs small and localized.

TS compiler options to keep in mind (`tsconfig.app.json`/`tsconfig.node.json`):
- `noUnusedLocals`, `noUnusedParameters`: remove unused code or prefix with `_` only if needed.
- `noUncheckedSideEffectImports`: avoid side-effect-only imports unless required.
- `verbatimModuleSyntax`: keep imports/exports valid ESM.

### Imports

- ESM only (`package.json` has `"type": "module"`).
- Prefer this general grouping:
  1. Side-effect imports (e.g., CSS) if needed
  2. External packages
  3. Local modules
  4. `import type` alongside related imports

Note: existing files are slightly mixed in semicolons/import ordering; follow the local file’s style and keep changes minimal.

### Formatting

- No formatter is configured (no Prettier/Biome). ESLint exists but does not enforce full formatting.
- Keep formatting changes minimal and avoid reformatting entire files.
- Use 2-space indentation (matches existing code).

### Naming

- Types: `PascalCase` (e.g., `NavConfig`, `ThemeMode`)
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE` for module-level constants (e.g., `NAV_STORAGE_KEY`)
- IDs/slugs: use explicit helper functions (e.g., `slugifyId`) rather than ad-hoc logic.

### Error handling

Frontend (`src/`):
- Prefer explicit `try/catch` around `fetch` and JSON parsing.
- Return `null`/`false` from API wrappers on failure (pattern in `src/lib/navApi.ts`).

Pages Functions (`functions/api/`):
- Use `jsonResponse()` / `textResponse()` from `functions/api/_util.ts`.
- Validate request content-type (`isJsonRequest`) where applicable.
- Return explicit status codes (`401`, `415`, `500`, etc.) and stable error payloads.

Worker (`workers/favicon/`):
- Keep SSRF defenses intact (hostname checks, protocol checks).
- Enforce safe defaults (timeouts, size limits, content-type checks).

### React

- Functional components + hooks (no classes).
- Prefer `useMemo`/`useEffect` patterns already used in `src/pages/*`.
- Keep UI behavior changes focused; avoid broad component rewrites unless requested.

## Security and secrets

- Do not commit secrets. `.env`-style files are not present here; keep it that way.
- Admin auth expects Cloudflare Pages environment variables (see `README.md`).

## Cursor / Copilot instructions

- No Cursor rules were found (`.cursor/rules/` and `.cursorrules` are absent).
- No GitHub Copilot instructions were found (`.github/copilot-instructions.md` is absent).

## Suggested verification checklist for agents

Before finishing a change:
- `npm run lint`
- `npm run build`
- `npm run test:e2e:chromium` (or `npm run test:e2e` for full matrix)
- If touching worker: `npm run worker:favicon:typecheck`
- If touching Pages Functions: exercise the route via `wrangler pages dev` locally
