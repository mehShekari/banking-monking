# React / Next.js Patterns & Performance Reference

Synthesized from Vercel Engineering's `react-best-practices`, `composition-patterns`, and `react-view-transitions` agent skills (vercel-labs/agent-skills). Rule names paraphrased in our own words; see sources.md for links.

## Composition patterns (avoid prop proliferation)

- **Compound components over boolean props**: when a component grows multiple `isX`/`showY` booleans to alter behavior, split into a compound-component family sharing context (e.g. `Menu`, `Menu.Item`, `Menu.Trigger`) instead of one component branching internally.
- **Lift state into a provider**, expose a context interface separated into `state`, `actions`, and `meta` — consumers should never need to reconstruct behavior from scattered props.
- **Children over render props** for slot-style flexibility (`<Card>{customContent}</Card>` beats `<Card renderContent={...} />` in most cases).
- **Explicit variants over mode flags**: create `ThreadComposer` / `EditComposer` as distinct components composed from shared internals, rather than one `Composer` with an `isThread` switch scattered through its body.
- Decouple state management from UI so the same logic can back multiple visual variants.

## Eliminating waterfalls (critical impact)

- Start independent async calls together; only chain when one genuinely depends on another's result. Use `Promise.all` or start promises early and `await` them later, rather than sequential `await`.
- In Server Components, parallelize fetches across sibling components — composition naturally parallelizes if each component starts its own fetch instead of one parent awaiting everything serially.
- Add strategic `<Suspense>` boundaries so slow branches stream in without blocking the rest of the page.
- In API routes/route handlers, avoid a fetch → then another fetch → then a third pattern when any two are independent.

## Bundle size (critical impact)

- Dynamic-import (`next/dynamic` or `import()`) rarely-used or below-the-fold client components.
- Use statically analyzable import paths (avoid dynamic string-built import paths) so bundlers can tree-shake and code-split correctly.
- Check `next build` output regularly for unexpectedly large route chunks; a single unnecessary full-library import is a common cause.

## Server-side performance (high impact)

- Authenticate Server Actions exactly like API routes — a Server Action is a public endpoint.
- Avoid duplicate serialization: don't pass the same large object across multiple RSC boundaries redundantly.
- Avoid shared module-level state for per-request data (causes cross-request leakage in serverless/edge).
- Hoist static I/O (reading a font file, a static config, a logo) to module scope so it runs once, not per-request.
- Use `React.cache()` for per-request dedup of a fetch/computation called from multiple components.
- Use `after()` for work that shouldn't block the response (logging, analytics, non-critical side effects).

## Client-side data fetching (medium-high impact)

- Deduplicate identical in-flight requests (SWR/TanStack Query do this automatically — don't hand-roll fetch dedup).
- Use passive event listeners for scroll-related handlers to avoid blocking scroll performance.
- Version and cap `localStorage` payloads — unbounded growth or stale-shape data causes real bugs and perf issues over time.

## Re-render optimization (medium impact)

- Calculate derived state during render — don't `useEffect` to sync one state value from another.
- Defer reading state until the point of use rather than hoisting it into intermediate variables unnecessarily.
- Don't wrap a primitive-returning expression in `useMemo` — the overhead isn't worth it for cheap primitives.
- Extract components that re-render often into their own memoized component rather than memoizing inline JSX.
- Narrow `useEffect` dependency arrays to exactly what's needed — broad deps cause extra re-runs.
- Put interaction logic in event handlers, not in effects that react to state changes caused by that interaction.
- Use functional `setState` updates (`setX(prev => ...)`) to avoid stale-closure bugs, especially in callbacks/effects.
- Use lazy state initialization (`useState(() => expensiveInit())`) for expensive initial values.
- Use `useTransition` for non-urgent updates (filtering, tab switches) so urgent input (typing) stays responsive.
- Use `useDeferredValue` for expensive derived renders driven by fast-changing input.
- Use `useRef` for values that change but never should trigger a re-render.

## Rendering performance (medium impact)

- Avoid layout-forcing operations (reading layout properties right after writing them) — batch reads and writes separately.
- Prefer CSS transitions/animations over manual JS-driven style loops.
- Watch for hydration mismatches from `Date`, `Math.random`, locale formatting, or browser-only APIs used during SSR — gate with client-only rendering or stable server values.

## View Transitions (React `<ViewTransition>` + Next.js)

- Implementation priority order: (1) shared element transitions for "same thing, going deeper", (2) Suspense reveals for "data loaded", (3) list-identity `key`s for reordering, (4) enter/exit for appear/disappear, (5) route-level transitions for navigation. Implement every pattern that fits the app, not just one.
- Reserve directional slide transitions for hierarchical navigation (list → detail) or genuinely ordered sequences (prev/next); lateral tab-to-tab navigation should fade or use no transition — a directional slide falsely implies spatial depth.
- Don't wrap a Next.js layout's `{children}` in a `<ViewTransition>` if pages define their own — nested view transitions won't fire enter/exit inside a parent transition.
- Isolate persistent elements (headers, navbars) with a stable `viewTransitionName` so they don't get swept into unrelated transitions.
- Always pair `enter` with `exit`, and always include a `default: "none"` fallback case.
- Respect `prefers-reduced-motion`.

## TanStack Query / data layer notes

- Query keys must include every parameter the query result depends on — a key missing a filter/param causes stale-cache bugs where different params return the same cached data.
- Invalidate/update exactly the affected query keys after a mutation; avoid blanket refetch-everything unless genuinely necessary.
- Put a typed adapter/interface between components and the actual fetch implementation so the data source can be swapped or mocked (MSW) without touching UI code.
