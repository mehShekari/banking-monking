# Sources

All rules in this skill are paraphrased/synthesized in our own words from the following publicly available agent-skill repositories. No large verbatim blocks were copied; consult the originals for full text and exact licensing terms.

## Anthropic — `anthropics/skills`

- **frontend-design**
  https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
  Also listed on skills.sh: https://www.skills.sh/anthropics/claude-code/frontend-design
  License: per-skill LICENSE.txt in the repo ("Complete terms in LICENSE.txt").
  Used for: Design Craft section (avoiding generic "AI slop" visual defaults, deliberate typography/color/structure/motion choices).

- **web-artifacts-builder**
  https://github.com/anthropics/skills/blob/main/skills/web-artifacts-builder/SKILL.md
  License: per-skill LICENSE.txt in the repo.
  Referenced for context on React+TS+Vite+Tailwind+shadcn/ui stack conventions for building artifacts; not directly quoted (this skill targets full app codebases, not single-file artifacts).

## Vercel Labs — `vercel-labs/agent-skills`

- **react-best-practices**
  https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md
  Full compiled doc: https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/AGENTS.md
  Announcement: https://vercel.com/blog/introducing-react-best-practices
  Used for: React Patterns, Next.js App Router, and Performance sections (waterfalls, bundle size, server-side performance, re-render optimization, rendering performance categories).

- **composition-patterns**
  https://github.com/vercel-labs/agent-skills/blob/main/skills/composition-patterns/SKILL.md
  https://github.com/vercel-labs/agent-skills/blob/HEAD/skills/composition-patterns/README.md
  Used for: React Patterns section (compound components, state lifting, children-over-render-props, explicit variants).

- **react-view-transitions**
  https://github.com/vercel-labs/agent-skills/blob/main/skills/react-view-transitions/README.md
  https://github.com/vercel-labs/agent-skills/blob/4ec6f84b/skills/react-view-transitions/AGENTS.md
  Used for: View Transitions subsection in references/react-nextjs-performance.md.

- **web-design-guidelines** (referenced by name in vercel-labs/agent-skills catalog; used as corroborating context, not directly quoted since detailed content wasn't independently fetched)
  https://github.com/vercel-labs/agent-skills

## Not independently verified in this session

- skills.sh leaderboard rankings (site was not reachable via the extraction tool during research; frontend-design's install count of ~56.9K was visible via search snippet only).
- Any dedicated accessibility-specific marketplace skill — accessibility rules in this skill are drawn from general WCAG/senior-practice knowledge, not a specific marketplace skill, since none was confirmed as a leading dedicated a11y skill during research.

## Attribution note

This skill is an original synthesis: rules were reworded, reorganized, and combined with general senior front-end practice (TypeScript strictness, RTL/Persian handling, styling-system discipline, TanStack Query conventions) that is not sourced from any single skill above. No SKILL.md, AGENTS.md, or README content from the above repos is reproduced verbatim beyond short illustrative phrases.
