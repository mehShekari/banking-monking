---
name: nextjs-feature-module-architecture
description: >-
  Applies a Next.js 16 App Router feature-module architecture (thin routes,
  domain modules, BFF, RSC + TanStack Query, next-intl, logical CSS, pnpm
  workspace). Use when scaffolding or reviewing any Next.js app, adding a
  domain module/page/API route, or when the user mentions ساختار پروژه,
  ماژول, BFF, clean Next.js structure, or feature folders.
---

# Next.js feature-module architecture

Reusable architecture for **any** Next.js App Router app: one app at the repo root (or `apps/<name>`), domain modules, a thin BFF, and shared `@repo/*` packages.

Adapt product names, locales, and package scope to **this** repo. Do not copy another product's modules, copy, or query-key prefixes.

**Golden path for a new domain:** full CMS shape (`pages` + `server` + `api` + `hooks`). Do **not** copy a legacy landing/`HeroSection/index.tsx` folder as the default.

## When to apply

- Scaffolding a new Next.js App Router project
- Adding a domain, page, BFF route, hook, or i18n namespace
- Reviewing PRs for folder / import / RSC / i18n / RTL violations
- The user asks for clean Next structure, modules, or BFF

Read the matching reference before writing code:

- Folder tree, module shape, import matrix → [folder-structure.md](folder-structure.md)
- Patterns (thin route, hydrate, BFF, shells) → [design-patterns.md](design-patterns.md)
- Naming, RSC, i18n, RTL, lint → [clean-code.md](clean-code.md)
- New-repo bootstrap → [scaffolding.md](scaffolding.md)
- Copy-paste templates → [examples.md](examples.md)

## Fit this repo first

1. Reuse existing locales, `@repo` (or `@acme`) package names, and module names.
2. Next **16+**: `src/proxy.ts`. Next **15**: `src/middleware.ts`. Same job (i18n + edge guards).
3. If the app has one locale, still keep strings in `messages/<locale>/` — do not hardcode UI copy.
4. Logical Tailwind (`ms-*`, `text-start`) even for LTR-only apps (they do not hurt).

## Non-negotiable rules

1. **`src/app` is routing only.** Allowed: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, metadata. No domain UI, no upstream API calls inline.
2. **Domain code lives in `src/modules/<domain>/`.** The route imports the module page (and optionally `modules/<d>/server`). Modules never import `src/app/**`.
3. **Browser never calls the upstream API.** Client fetchers hit `/api/...`. `src/app/api/**` is a thin BFF that calls `@repo/system` (or equivalent) server fetchers.
4. **Server loaders are `server-only`.** Put them in `modules/<d>/server/` and export from `server/index.ts`. Never re-export them from the module root barrel.
5. **i18n first.** No hardcoded UI copy. Server: `getTranslations`. Client: `useTranslations`. Links: `Link` from `@/i18n/navigation` — never `next/link`.
6. **Logical Tailwind** for anything that must flip in RTL: `ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `start-*`. Not `ml-*` / `text-left` / `left-*`.
7. **Workspace packages via `@repo/<pkg>/<subpath>`** (or the repo's scope). No relative imports into `packages/` or `tools/`.
8. **Layout grid:** `Container`, `Row`, `Col` from `@/components/layout`.
9. **Do not create** `src/lib/`, `src/helpers/`, `src/hooks/`, `src/store/`, `src/ui/`, or empty module subfolders.
10. **No global Zustand/Redux.** No form library unless the product needs one. Zod validates BFF/upstream **responses**, not UX forms by default.

## Decide the data path

| Kind | Pattern |
| --- | --- |
| Interactive / CMS | RSC `load*PageSeed` → prefetch + dehydrate → `QueryHydrationBoundary` → client `useQuery` (hydrated `staleTime: Infinity`) → later refetch via BFF |
| Mostly static | Server loader `load*PageData` (or a direct server fetcher) in the module page; degrade to empty UI on failure |

`export const dynamic = "force-dynamic"` on pages that must not be statically cached against an upstream API.

## New feature checklist

```
- [ ] Route under src/app/[locale]/<path>/page.tsx is thin (locale, metadata, SEO, compose module)
- [ ] matching loading.tsx / error.tsx using the module *Skeleton and a shared route error
- [ ] src/modules/<domain>/ with only folders that have files
- [ ] pages/<Name>Page.tsx is a Server Component that composes sections
- [ ] If live data: server/loadXPageSeed.ts + api/xClient.ts + hooks/useX.ts + GET BFF
- [ ] If static: server/loadXPageData.ts, no client upstream URL
- [ ] index.ts exports client-safe surface only (never server/)
- [ ] i18n JSON for every locale in routing.ts; namespace registered in src/i18n/request.ts
- [ ] Link from @/i18n/navigation; logical Tailwind; cn() from @repo/utils/cn; icons from @repo/icons
- [ ] Colocated *Skeleton; QuerySectionState for inline query UI
```

## New project checklist

See [scaffolding.md](scaffolding.md). Minimum: pnpm workspace + catalog, Next App Router `output: "standalone"`, next-intl, TanStack Query, Biome, `@/*` alias, `@repo/system|utils|icons`, first module using the CMS shape.

## Agent workflow

1. Identify **new repo** vs **new domain** vs **change inside an existing module**.
2. Read [folder-structure.md](folder-structure.md) if placing files; [design-patterns.md](design-patterns.md) if wiring data; [clean-code.md](clean-code.md) if naming/RSC/i18n; [examples.md](examples.md) when generating files.
3. Match names already used in **this** repo before inventing new ones.
4. Keep route files ~20–55 lines. Split when a file mixes controller + view or grows past ~150 lines.
