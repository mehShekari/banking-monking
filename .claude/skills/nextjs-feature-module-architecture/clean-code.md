# Clean code

## Naming

| Kind | Pattern | Example |
| --- | --- | --- |
| Component file | PascalCase, domain prefix | `FaqAccordionItem.tsx`, `BlogSearchModal.tsx` |
| Page (module) | `*Page` | `FaqPage`, `AboutPage`, `WidgetsPage` |
| Route default | `Page` / `Home` | `src/app/[locale]/faq/page.tsx` |
| Skeleton | `*Skeleton` | `FaqSectionSkeleton` |
| Data hook | `use<Resource>` | `useFaqCategories` |
| Controller hook | `use<Domain>Controller` | `useFaqSectionController` |
| Client fetcher | `fetch<X>Client` | `fetchFaqCategoriesClient` |
| Server seed | `load<X>PageSeed` | `loadFaqPageSeed` |
| Server data | `load<X>PageData` | `loadAboutPageData` |
| BFF route | named verb export | `GET` in `src/app/api/faqs/route.ts` |
| Constants file | camelCase file, `SCREAMING_SNAKE` export | `FAQ_HYDRATED_QUERY_OPTIONS` |
| Query keys | nested object | `queryKeys.faqs.categories(locale)` |
| i18n namespace | domain name | `faq.json`, `common.json` |
| Route folders | kebab-case | `purchase-credit`, `gold-silver` |

If **this** repo already uses a prefix (`useWebsiteX`, `fetchWebsiteXClient`, `queryKeys.website`), keep it. Do not mix styles inside one app.

Exports: **default** for React components; **named** for hooks, utils, loaders, constants.

New UI is a single PascalCase file unless the folder needs private helpers. Avoid `HeroSection/index.tsx` as the default.

## File size and split

Target **40–150 lines**. Route files **20–55**.

Split when a file would mix:

- Page vs section vs widget
- Controller vs view
- Chrome vs small pieces (Header delegates to `HeaderNavLink`, `HeaderActions`, …)

Keep composing in the page; do not grow a god component.

## Server vs client

- Route + module `pages/` are Server Components unless they truly need the browser.
- `"use client"` at the **leaf** that needs state, effects, or Query — not on the page just because a child is client.
- `import "server-only"` is the first non-comment line of every loader barrel and of `@repo/system` server fetchers.
- Live-data routes that must stay fresh: `export const dynamic = "force-dynamic"`.

## Imports

Biome organizeImports groups:

1. npm packages (`next`, `react`, `next-intl`, …)
2. blank line
3. `@repo/**` (or the repo scope)
4. blank line
5. `@/**`
6. blank line
7. relative

Type-only imports last in the group (`import type`).

Forbidden:

- `next/link` under `src/**` — use `Link` from `@/i18n/navigation`
- Relative paths into `packages/` or another app
- Importing `modules/<d>/server` from a Client Component

## i18n

- Every user-visible string is a message key in **every locale** listed in `routing.ts`.
- Register new namespaces in `src/i18n/request.ts`.
- Lint should fail when keys drift across locales (`scripts/i18n-check.mjs`).
- Metadata keys live under `<ns>.metadata`.
- `timeZone` in request config matches the product (do not copy another country's zone).

## RTL / LTR

Prefer logical Tailwind even in LTR-only apps:

| Physical (avoid for direction) | Logical |
| --- | --- |
| `ml-*` / `mr-*` | `ms-*` / `me-*` |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` |
| `left-*` / `right-*` | `start-*` / `end-*` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `float-left` | `float-start` |

`<html>` `lang` and `dir` come from the locale layout — do not hardcode `dir="rtl"` on inner shells unless a subtree is intentionally opposite.

## Styling

- Tokens from `@repo/tailwind-config`. `src/styles/globals.css` starts with `@import "@repo/tailwind-config/style.css"`.
- Class merging: `cn` from `@repo/utils/cn`.
- Icons: `@repo/icons` — do not inline one-off SVGs when a repo icon exists.
- Prefer design tokens over raw hex; a `check-no-raw-hex` script is recommended.
- CSS modules (`*.module.css`) only for motion-heavy exceptions. Default is Tailwind utilities.

## Layout grid

```tsx
import { Col, Container, Row } from "@/components/layout";

<Container className="px-6 pb-16">
  <Row>
    <Col lg={8} xs={12}>{main}</Col>
    <Col lg={4} xs={12}>{side}</Col>
  </Row>
</Container>
```

`Col` spans: `xs` `sm` `md` `lg` `xl` `xxl`. Offsets are logical.

## Console, a11y, errors

- `console` allowed: `error`, `info`, `warn`, `assert`. Not `log` / `debug`.
- Interactive elements: real `button`/`a`, captions on media, labels on inputs.
- Route errors re-export a shared client error view. `global-error.tsx` is standalone HTML (no next-intl).
- Upstream failures: shared error state + optional `useErrorMessage` helper.

## Zod and forms

Zod belongs in `@repo/system` HTTP schemas. Do not add a form library (react-hook-form / Formik) unless the product has real forms. Search and filters are local controlled state.

Do not add `modules/<d>/schemas/` for UX unless a form is specified.

## Forbidden folders and dumps

Do not create: `src/lib`, `src/helpers`, `src/hooks`, `src/store`, `src/ui`, `src/api` (routes are `app/api`, clients are `modules/<d>/api`).

Do not scaffold empty `hooks/` / `api/` / `server/` “just in case”.

## Tests

- Colocate pure-util tests next to the util.
- Prefer Testing Library for components.
- Package tests lock HTTP/query contracts (`packages/system/src/**/__tests__/`).
