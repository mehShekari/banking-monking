# Folder structure

Empty folders are forbidden. Do not invent `src/lib`, `src/hooks`, `src/store`, or `src/ui`.

This is the **target shape** for any Next.js App Router app. Replace `<app>`, locales, and domain names with the product's.

## Repository

```
<app>/
├── src/                      Next.js app (routes, modules, shell)
├── public/                   Static assets
├── packages/
│   ├── system/               @repo/system — HTTP client, query, providers
│   ├── utils/                @repo/utils — cn, pure helpers
│   └── icons/                @repo/icons — SVG React icons + logos
├── tools/
│   ├── tailwind-config/      Design tokens, fonts, PostCSS
│   ├── biome-config/         Shared Biome rules
│   └── typescript-config/    TS presets (base / react / nextjs)
├── e2e/                      Playwright specs
├── scripts/                  i18n-check, style guards
├── pnpm-workspace.yaml       packages/* + tools/* + catalog
├── next.config.js            standalone + next-intl plugin
├── biome.json                extends tools/biome-config
└── tsconfig.json             @/* → ./src/*
```

If the repo already uses another scope (`@acme/*`), keep it. Do not introduce a second namespace.

Prefer a pnpm workspace **even for one app** so kernel code stays out of `src/`.

Path aliases (app-local only):

```json
"@/*": ["./src/*"],
"@/public/*": ["./public/*"]
```

Cross-cutting code is `@repo/<pkg>/<subpath>` (TypeScript **source** exports, no `dist/`).

## `src/` top-level allowlist

```
src/
├── app/                 App Router
├── modules/             Domain features
├── components/          Site chrome + layout grid (not domain UI)
├── i18n/                next-intl routing, messages, metadata
├── shared/              App-local glue (seo, query UI, a11y) — no root barrel
├── providers/           Composed React providers
├── styles/              globals.css (@import tokens) + app CSS
├── test/                Vitest helpers (optional)
├── types/               Ambient d.ts only
├── __tests__/           App-level tests
└── proxy.ts             Next 16+ request interception (Next 15: middleware.ts)
```

Root `src/app/layout.tsx` returns `children` only. `<html lang dir>` lives in `src/app/[locale]/layout.tsx`.

## App Router

```
src/app/
├── layout.tsx                 Passthrough root (no <html>)
├── global-error.tsx           Full HTML; cannot use next-intl
├── not-found.tsx
├── robots.ts / sitemap.ts     Optional
├── api/                       BFF (thin GET/POST proxies)
│   ├── _lib/handle-api-get.ts
│   └── <domain>/route.ts
└── [locale]/
    ├── layout.tsx             html/body, NextIntlClientProvider, Providers, shell
    ├── loading.tsx / error.tsx / not-found.tsx
    ├── (home)/page.tsx
    └── <domain>/              one segment per route; loading + error beside page
```

Locales and prefix come from `src/i18n/routing.ts` (example: `localePrefix: "as-needed"` so the default locale has no prefix).

Almost every segment has `loading.tsx` + `error.tsx` that **mirror the page layout** (module skeleton, not a generic spinner).

## Modules

```
src/modules/
└── <domain>/           one folder per product domain
```

Host modules (a listing plus several product slices) nest subdomains: `modules/services/ai`, `modules/services/listing`, `modules/services/shared`.

Tiny shared constants may live as a slim module (`modules/settings/constants/`) without pages.

### Module subfolder allowlist

Create a folder only when it has files:

| Folder | Role |
| --- | --- |
| `pages/` | One file per route. Consumed by `src/app/**/page.tsx` |
| `components/` | PascalCase files or `Name/index.tsx` |
| `hooks/` | `"use client"` hooks (`useX`, `useXController`) |
| `api/` | Browser fetchers to `/api/...` (`fetchXClient`) |
| `server/` | `import "server-only"` loaders; `server/index.ts` barrel |
| `constants/` | Query options, IDs, enums |
| `types/` | Domain TS types |
| `utils/` | Pure helpers |
| `index.ts` | **Required** client-safe public barrel |

Do not put DB/JWT/Mongoose inside an app module. Server-only platform code belongs in `@repo/system`. Do not add `schemas/` for forms unless the product has a real form.

### Canonical live-data module

```
<domain>/
├── index.ts                         client-safe barrel
├── pages/<Domain>Page.tsx
├── components/                      sections + *Skeleton
├── hooks/                           useX, optional useXController
├── api/<domain>Client.ts
├── server/index.ts                  import "server-only"
├── server/load<Domain>PageSeed.ts
├── constants/queryOptions.ts
└── utils/                           only if needed
```

Root barrel documents the split:

```ts
/**
 * <Domain> module — public client-safe surface.
 * Server loaders live in `@/modules/<domain>/server` (server-only).
 */
```

### Host module

When several routes share a family:

```
services/
├── index.ts                         re-exports *Page only
├── listing/pages/  components/  constants/
├── shared/components/DetailPageShell.tsx
└── <slice>/pages/  components/  constants/
```

Each slice: `pages/` + `components/` + `constants/`.

### Barrel rules

**Never** export `server/` from `modules/<d>/index.ts`.

Intended public surface: pages, hooks, types. Pragmatic extras that stay client-safe: client fetchers, query option constants, path utils, selected components needed by routes or other modules.

Pages-only barrels and richer client barrels are both valid; **server-only is the hard line**.

### What not to treat as a template

- Folder-as-component trees (`HeroSection/index.tsx`) without `api/` / `server/`
- Routes that only redirect and have no module
- Constant-only folders presented as full domains

## Components vs shared vs modules

| Location | Owns |
| --- | --- |
| `src/components/` | Header, Footer, SiteShell, layout grid, system (loading/error/404) chrome |
| `src/shared/` | SEO JSON-LD, query UI, a11y, app-specific helpers. **No root `shared/index.ts`** — deep-import |
| `src/modules/<d>/` | All domain UI and data |

Two breadcrumbs when SEO matters:

- Visual: `@/components/Breadcrumb` + `Link` from `@/i18n/navigation`
- JSON-LD: `@/shared/seo/Breadcrumb` injected by the **route** file

## Packages

### `@repo/system`

Source exports (no build). Typical subpaths:

- `http/client`, `http/types`, `http/bff-schemas` (names may be `gateway-*` in an existing repo — keep them)
- `query/<app>-api` — **server-only** upstream fetchers (`cache()` wrapped)
- `query/keys` — hierarchical TanStack keys under `["<app>", ...]`
- `query/server/get-query-client` — request-scoped `cache(() => createQueryClient())`
- `providers/react-query`, `providers/query-hydration`

### `@repo/utils`

- `./cn` — `clsx` + `tailwind-merge`
- Pure helpers only (no hooks, no DOM, no Node-only APIs on the public surface)

### `@repo/icons`

```ts
import { Search } from "@repo/icons";
import { Logo } from "@repo/icons/logos";
```

## Import matrix

| Consumer | May import |
| --- | --- |
| `src/app/**/page.tsx` | `@repo/*`, `@/modules/<d>`, `@/modules/<d>/pages/*`, `@/modules/<d>/server`, `@/i18n/*`, `@/shared/seo`, `@/components/*` |
| `src/app/api/**` | `@repo/system/query/*`, `@repo/system/http/*`, `@/app/api/_lib` |
| `src/modules/<d>/**` | relative inside the module, `@/*`, `@repo/*`. Other modules only via their barrel or a documented public path |
| `src/components/**` | `@/*`, `@repo/*` — not domain internals |
| `packages/*` | own src + `@repo/*` peers — never `@/` |

Lint: forbid `next/link` under `src/**`. Import order: npm packages → `@repo/**` → `@/**` → relative.

## Tests

- App: `src/__tests__/` and colocated `modules/**/__tests__/`
- Packages: `packages/<pkg>/src/**/__tests__/`
- E2E: `e2e/` + Playwright at repo root
