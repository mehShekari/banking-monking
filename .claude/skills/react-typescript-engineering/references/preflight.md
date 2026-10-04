# Preflight

Inspect the repository; do not answer from memory. Depth scales with the task — a one-line
fix may cover all of this in a single grep.

## 1. Requirement

- What exactly is requested, and what is the expected behavior?
- Constraints (RTL, mobile width, mock-only backend, motion rules)?
- What existing behavior must stay unchanged?
- **Does the requested behavior already exist?** Grep for it and read it through. If it does,
  stop building: validate it, report where it lives (`file:line`), and list only real gaps.
  An empty diff is a valid IMPLEMENT result.
- If an acceptance criterion is missing and it changes the design, ask. Otherwise pick the
  obvious default and state it.

## 2. Codebase

Find, by searching (`Grep` for the domain word, the route, the type name):

- related components, hooks, API functions, parsers/mappers, types
- the closest existing implementation of something similar — it is the template
- existing `*.check.mjs` covering this logic
- every caller of anything you are about to change (DEBUG / REFACTOR: mandatory)

## 3. Responsibilities

Split the work into:

| Kind | Lives in (this repo) |
|---|---|
| UI | `apps/web/src/features/<name>/components/`, `apps/web/src/features/<name>/pages/`; shared UI in `apps/web/src/shared/ui/` |
| Application (orchestration, query hooks) | `apps/web/src/features/<name>/api/use<Name>.ts`, `apps/web/src/features/<name>/hooks/` |
| Domain (pure rules, derivation, parsing) | `apps/web/src/features/<name>/model/` — pure, testable with a `.check.mjs` |
| Infrastructure (HTTP, storage) | `apps/web/src/features/<name>/api/<name>.api.ts`, `apps/web/src/shared/api/{callApi,api,session}.ts`, `apps/web/src/shared/lib/systemLocalStorage.ts` |
| State | local `useState` → shared parent / feature hook → context (theme) → query cache (server data); no global client store yet |

## 4. Boundaries

- Component boundaries: one meaningful concept each.
- Hook boundaries: a hook only when it owns reusable stateful behavior.
- Type boundaries: `unknown` at the network edge → parser → domain type. UI view models only
  when they genuinely differ from the domain type.
- State ownership: one source of truth, as close to its readers as possible. Derived values are
  computed during render.

## 5. Existing abstractions

Before creating anything new, answer: does something here already solve it?
(`toast`, `field`/`select`/`wheelPicker`, `bottomSheet`/`popover`, `atlasPlate`, `useEnter`,
query hooks, parsers in `utils/`.) Reuse wins. A new abstraction must be the smallest meaningful one.

## 6. Validation plan

Decide now which checks from SKILL.md §3 apply, so validation is not an afterthought.

## Gate

Write down (for non-trivial work, in one short block) the six answers from SKILL.md §2.
Only then implement. REVIEW mode skips the gate.
