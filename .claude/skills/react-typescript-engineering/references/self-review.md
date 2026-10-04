# Self-review

Review the target as a senior React + TypeScript engineer who will maintain it for two years.
The target is your diff (`git diff` + new untracked files); when the diff is empty because the
behavior already existed, the code that meets the requirement; in REVIEW mode, the reviewed
files plus what they import and their callers. For each hit: is it a **real problem** or a
preference? Fix real problems when the fix is clear; report the rest.

## The 20 checks

1. abstractions or indirection added for a principle's sake rather than a current need
2. SRP — a module/component/hook doing several unrelated jobs
3. unnecessary abstractions (one-implementation interfaces, wrappers that add nothing)
4. duplicated logic that already exists elsewhere in the repo
5. a component too large to scan or test (by responsibility, not line count)
6. prop drilling through layers that do not use the prop
7. `useEffect` for derived state or event handling
8. state owned at the wrong level, or two sources of truth
9. `any`
10. unjustified `as`, `!`, `@ts-ignore`, `@ts-expect-error`
11. business logic inside UI components
12. API calls inside components instead of the feature's `api/`
13. poor component boundaries
14. obvious unnecessary re-renders (unstable context values, state too high) — or needless memoization
15. missing loading / error / empty states on async UI
16. new dependencies that a few lines or an existing one would cover
17. changes unrelated to the task
18. naming (`data`, `result`, `temp`, `item`, `x` where a real name exists)
19. hidden side effects (mutation of args, module-level state, effects that write elsewhere)
20. inconsistency with the repo's established architecture

Also: errors swallowed silently · API shapes leaking into UI without a parser · hard-coded strings
where the neighbours use `t()` (most pages here hard-code Persian — match the neighbour file) ·
async mutations that race their own refetch (optimistic update without cancelling every query
key the screen reads) · accessibility regressions (name, role, keyboard, focus).

## Checklist before declaring done

- [ ] Responsibilities separated; business logic not coupled to UI
- [ ] Existing abstractions reused; nothing speculative added
- [ ] No unnecessary `useEffect`; state at the right level; server vs UI state separated
- [ ] Types model the domain; no `any`, no unjustified assertions, no suppressed errors
- [ ] Names meaningful; functions focused; duplication reasonable
- [ ] No premature memoization; code splitting considered only where it earns its place
- [ ] Validation run and reported (SKILL.md §3) — PASS / FAIL / NOT RUN
- [ ] Repair loop ≤ 3 cycles; leftovers listed under "Remaining concerns"
