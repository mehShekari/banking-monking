---
name: react-typescript-engineering
description: Engineering guardrail for any task that creates, modifies, refactors, debugs, or reviews React / TypeScript code in this repo — components, hooks, TS types or compiler errors, state, API integration, frontend performance, frontend tests, or a code review. Runs preflight → architecture gate → implement → validate → self-review with a bounded repair loop. Invoke it even when the change looks small, quick, obvious, or touches one file. Not for git-only, docs-only, translation, product copy, or pure visual/CSS craft with no code decision (impeccable and senior-frontend-engineer own design craft).
---

# React + TypeScript Engineering

An engineering guardrail, not a code generator. It optimizes for **correctness, maintainability,
consistency, type safety, and appropriate simplicity** — never for more abstractions, patterns,
files, generics, hooks, or components.

The rules live in `.claude/rules/react-typescript-engineering.md` (loaded every session); this
skill is the workflow that applies them. `docs/Skill Invocation Contract.md` is the design
background for humans — agents need not read it.

## 1. Pick the mode

Decide from the request. State it in one line before starting ("Mode: DEBUG").

| Mode | When | Flow | Hard constraint |
|---|---|---|---|
| **IMPLEMENT** | new functionality | preflight (does it already exist?) → design → implement → validate → self-review | smallest clean design that fits the repo; an empty diff is a valid result |
| **REFACTOR** | improving existing code | understand behavior → inspect dependents → design minimal safe change → refactor → validate → regression review | behavior unchanged unless the user asked |
| **DEBUG** | a bug | reproduce → root cause → inspect callers → minimal correct fix → validate → self-review | fix the cause where all callers route through; no broad refactor |
| **REVIEW** | reviewing code | read the target + what it imports and its callers → apply `references/self-review.md`'s checks to those files → `tsc` + eslint on them → report | **no edits** unless asked; skip the implementation gate |

**Trivial** (copy text, one prop, a rename, a one-line fix in one file): state the mode, make the
change, run `npx tsc -b`, one-line summary. No gate block, no reference files.
**Non-trivial** = touches more than one file, adds state, or changes a type or API shape:
the full workflow below. Invocation is never skipped; only depth shrinks.

## 2. Preflight — inspect, never guess

Run `references/preflight.md`. For non-trivial work, write down these six answers before coding:

1. Where does this logic belong?
2. Is there an existing abstraction that already solves it — or is the behavior already there?
3. Is it UI, application, domain, or infrastructure logic?
4. Who owns the state — and is it server state or UI state?
5. What types represent the data?
6. What is the smallest clean implementation?

### This repo (spot-check the bullet you rely on with one grep/ls; if false, say so in one line and follow the code)

- npm-workspaces monorepo (root `package-lock.json`): the app is `apps/web` (Vite 6 · React 19 · TypeScript 5.7, not
  Next.js); the Star Atlas it shares with the landing (theme, stars, constellation, `motion/gsap.ts`, `starMotion.ts`, `fa()`,
  `useMediaQuery`) is `packages/atlas`, imported as `@astrah/atlas/<path>`. Atlas never imports from an app.
- **Feature-based (decided 2026-09-28).** Three top-level areas:
  - `apps/web/src/features/<name>/`: `api/` (`<name>.api.ts` via `callApi`, `use<Name>.ts` query hooks), `model/`
    (types, boundary parsers, pure rules and their `.check.mjs`), `hooks/` (UI state that is not server data),
    `components/`, `pages/` (thin route shells, lazy-loaded in `apps/web/src/app/router.tsx`). Template: `apps/web/src/features/career/`.
  - `apps/web/src/shared/`: code two or more features use: `ui/` (UI kit, constellation, page header, icons), `motion/`
    (`gsap.ts`, `useEnter.ts`), `api/` (`api.ts`, `callApi.ts`, `session.ts`, `mock/`), `hooks/`, `lib/`, `theme/`,
    `styles/`. Shared code never imports from a feature or from `apps/web/src/app/` (the one exception is `shared/api/mock/`, the stand-in backend, which knows domain types); where shared code needs app behaviour it exposes a hook-in, e.g. `setUnauthorizedHandler` in `shared/api/api.ts`, set by `app/router.tsx`.
  - `apps/web/src/app/`: wiring only: `App.tsx`, `router.tsx`, `providers/` (query client, theme mode, PWA prompt), `routeElements.tsx` (guards, lazy fallback), `layout/`. There is no global client store: server data lives in the query cache, forms in react-hook-form, the theme in context; add a store only for client state several features share.
  A feature may use another feature's public pieces (Today shows `CareerPlate`, uses the goals model); no
  `index.ts` barrels. Features: auth, career, goals, today, calendar, profile, uiKit (dev only).
- **Server state** = the feature's `use<Name>.ts` query hooks. Responses are `unknown` and go through the
  feature's `model/` parser (see `apps/web/src/features/career/api/useCareer.ts` → `parseCareerGoal`). Reference data
  is a query too, with `staleTime: Infinity` (`useCategories` in `apps/web/src/features/goals/api/useGoals.ts`).
- **Node-checked model files** import siblings with an explicit `.ts` extension (`from "./career.ts"`;
  `tsconfig` allows it) so `node <file>.check.mjs` resolves them.
- Mock backend: `apps/web/src/shared/api/mock/` (`mockAdapter.ts`, `mockDb.ts`, `mockCareer.ts`).
- Styling: styled-components + theme tokens (`packages/atlas/theme/theme.ts`). RTL / Persian first; most pages
  hard-code Persian strings rather than `t()` — match the neighbour file.
- Motion: GSAP through `@astrah/atlas/motion/gsap` (plus `apps/web/src/shared/motion/`) and `ANIMATION.md`; react-spring for gestures only.
- Files are camelCase (`goalPlate.tsx`). Both `type` and `interface` appear — match the neighbour file.

## 3. Validate — the repo's commands, nothing invented

| Check | Command | Notes |
|---|---|---|
| TypeScript | `npx tsc -b` (in `apps/web`) | clean at baseline — any error is yours |
| Lint | `npx eslint <changed files>` | `npx eslint src` in `apps/web` is clean (0 errors, 0 warnings since 2026-09-28): keep it clean |
| Tests | `node <file>.check.mjs` | repo convention: assert-based checks (`*.check.mjs` beside the module, e.g. `apps/web/src/features/career/model/career.check.mjs`). Run the ones near your change. New non-trivial pure logic → add `<name>.check.mjs` beside it in the feature's `model/`, copying `career.check.mjs`'s import/assert style (Node 24 runs the `.ts` imports directly) |
| Behavior | `npm run dev:web` (mock backend) or the `run` skill | UI changes: perform the requested interaction once. NOT RUN needs a reason |
| Motion | `npm run motion:check` | only when GSAP/motion code changed |
| Build | `npm run build:web` | before calling a feature done (writes `apps/web/dist/`, gitignored) |

Report each as **PASS / FAIL / NOT RUN (reason)**. Never claim a check passed that you did not run.
A failing check means the task is not done.

## 4. Self-review and repair loop

Run `references/self-review.md` against your diff (`git diff` + new untracked files) — or, when
the diff is empty because the behavior already existed, against the code that meets the requirement.
Separate **real problems** from **preference** — do not restyle code merely because you would
write it differently.

```text
review → actionable issue? → fix → validate → review again   (max 3 cycles)
```

After 3 cycles, stop and list what remains instead of churning.

## 5. Output contract

IMPLEMENT / REFACTOR / DEBUG end with:

```text
## Implementation Summary
What changed: … (or "nothing — already implemented at file:line")
Architecture: … (where each responsibility landed, what was reused)
Validation: TypeScript PASS|FAIL|NOT RUN · Lint … · Tests … · Behavior … · Build …
Self-review: issues found … / fixed …
Remaining concerns: …
```

REVIEW ends with:

```text
## Review Findings
[bug|risk|maintainability|preference] file.tsx:12 — problem — minimal fix
… (bugs first; at most 2 preference items)
Validation: TypeScript … · Lint … (on reviewed files)
No edits made.
```

Keep both short.

## 6. Judgment over dogma

- No arbitrary thresholds. Split a component when its responsibilities become hard to understand,
  test, or change — never because it passed N lines.
- A one-line derivation from state (a filter, a sort) stays inline in the component.
- `useEffect` is for synchronizing with an external system. Not for derived values, not for events.
- Memoization needs a reason (measured or obvious hot path), not a habit.
- Extract shared logic on the third real caller, not the second.
- Precedence: this repo's code and `.claude/rules` → this skill → other loaded skills
  (impeccable / senior-frontend-engineer own visual craft only; ponytail's minimalism agrees with
  this section) → generic guidance. A valid repo convention wins; it never justifies unsafe types
  or broken React semantics. On conflict, follow the repo and say so in one line.

Anti-patterns to refuse: giant components · business logic or API calls in JSX · everything
global · effects for derived state · `any` / `@ts-ignore` / blind `as` · premature generic
abstractions · dumping-ground `utils.ts` · new dependencies for a few lines · blind memoization ·
unrelated refactors · copy-paste · swallowed errors · hidden side effects.

## 7. Enforcement

A project hook (`.claude/hooks/react-ts-review.mjs`, wired in `.claude/settings.json`) snapshots
`apps/web/src/` at each prompt. If a turn changed any `.ts/.tsx/.js/.jsx` under `apps/web/src/`, the first Stop is
blocked once with the self-review prompt. It never blocks twice in a row, so the repair loop's
cap is yours to honor.
