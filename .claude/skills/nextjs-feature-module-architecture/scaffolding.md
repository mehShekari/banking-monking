# Scaffolding a new Next.js app

Use this for a **greenfield** repo. When extending an existing app, skip steps that already exist and match that repo's locales, package scope, and module names.

Stack: Next.js 16 App Router (15 is fine with `middleware.ts`), React 19, Tailwind v4, next-intl, TanStack Query v5, Biome, pnpm workspace, Node ≥ 22.

## 1. Workspace

```
<app>/
├── src/
├── public/
├── packages/{system,utils,icons}/
├── tools/{tailwind-config,biome-config,typescript-config}/
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json          extends @repo/typescript-config/nextjs.json
├── biome.json             extends ./tools/biome-config/biome.json
├── next.config.js
└── .nvmrc
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - packages/*
  - tools/*

catalog:
  react: ^19.2.3
  react-dom: ^19.2.3
  next: ^16.2.4
  next-intl: ^4.4.0
  "@tanstack/react-query": ^5.99.0
  # pin the rest once; apps/packages use "catalog:"
```

Root app depends on `workspace:*` for `@repo/system`, `@repo/utils`, `@repo/icons`. Shared versions via `"react": "catalog:"`.

Packages are `"private": true`, `"version": "0.0.0"`, `exports` pointing at **source** (`./src/...`), no `dist/`.

## 2. Next config

- `output: "standalone"`
- `createNextIntlPlugin("./src/i18n/request.ts")`
- Path aliases: `@/*` → `./src/*`, `@/public/*` → `./public/*`
- Security headers in config, not in React

Request interception: Next 16+ `src/proxy.ts`; Next 15 `src/middleware.ts`. Compose next-intl middleware there.

## 3. `src/` skeleton

```
src/app/layout.tsx              # return children
src/app/[locale]/layout.tsx     # <html lang dir>, providers, shell
src/app/[locale]/(home)/page.tsx
src/app/api/_lib/handle-api-get.ts
src/modules/
src/components/layout/{Container,Row,Col}.tsx
src/i18n/{routing,navigation,request}.ts
src/i18n/messages/<default-locale>/common.json
src/providers/index.tsx
src/shared/
src/styles/globals.css          # @import "@repo/tailwind-config/style.css"
src/proxy.ts                    # or middleware.ts on Next 15
```

Root layout must **not** render `<html>`. Locale layout owns document attributes.

## 4. i18n bootstrap

Set locales from the product. Example (Persian default + English + Arabic):

```ts
// src/i18n/routing.ts
export const routing = defineRouting({
  locales: ["fa", "en", "ar"],
  defaultLocale: "fa",
  localePrefix: "as-needed",
  localeDetection: false,
});
```

Single-locale example:

```ts
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "never",
});
```

`navigation.ts` = `createNavigation(routing)`.

`request.ts` loads every namespace JSON. Add a namespace when you add a domain. Set `timeZone` to the product timezone.

Biome override: forbid `next/link` in `src/**`.

## 5. `@repo/system` minimum

- HTTP client + types + BFF Zod schemas
- `query/keys.ts` — prefix with the **app** name, not another product's
- `query/<resource>-api.ts` with `import "server-only"`
- `query/create-query-client.ts`
- `query/server/get-query-client.ts` (`cache(() => createQueryClient())`)
- `providers/react-query` + `providers/query-hydration`

## 6. `@repo/utils` and `@repo/icons`

- `cn` = `clsx` + `tailwind-merge`
- Icons as React components; logos on `@repo/icons/logos`

## 7. First domain

Do **not** start from a marketing hero folder.

For a live list page:

1. `src/modules/<d>/pages/<D>Page.tsx`
2. `server/load<D>PageSeed.ts` + `server/index.ts`
3. `api/<d>Client.ts`
4. `hooks/use<D>.ts`
5. `components/<D>Section.tsx` + `<D>SectionSkeleton.tsx`
6. `index.ts` client-safe barrel
7. Thin `src/app/[locale]/<d>/page.tsx` + `loading.tsx` + `error.tsx`
8. `src/app/api/<d>/route.ts` GET via `handleApiGet`
9. `src/i18n/messages/<locale>/<d>.json` for every locale + register namespace

For a static page: skip api/hooks/BFF; use `load<D>PageData` in the module page.

Templates: [examples.md](examples.md).

## 8. Providers and shell

```tsx
// src/providers/index.tsx
<ReactQueryProvider>
  {children}
</ReactQueryProvider>
```

Add AOS, analytics, etc. here when the product needs them.

Site chrome (`Header`, `Footer`) in `src/components/`, composed by locale layout / `SiteShell`. Domain pages do not mount the site header.

## 9. Lint and scripts

- Biome recommended + `noConsole` allow `error|info|warn|assert`
- `scripts/i18n-check.mjs` — key parity across locales
- Optional: `scripts/check-no-raw-hex.mjs`
- `pnpm lint` runs them together

## 10. Tests and deploy

- Vitest for units; Playwright in `e2e/`
- Docker standalone output; env via `.env.example` locally

## Do not

- Scaffold empty module subfolders
- Create `src/lib` or a global store “for later”
- Split platform code into per-domain packages (`@repo/faq`)
- Copy another product's locales, query-key prefix, or domain list
