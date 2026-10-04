# Design Craft Reference

Synthesized from Anthropic's `frontend-design` skill guidance and general senior UI-design practice. See sources.md for links.

## Ground the design before styling

- If the brief doesn't specify what the product/subject is, pin it yourself: name one concrete subject, its audience, and its single job. State the assumption before proceeding.
- The hero/opening should be a thesis for the whole piece — the most characteristic thing about the subject, expressed as a headline, image, live demo, or interactive moment. Not a generic banner.

## Recognized "AI slop" tells — avoid these defaults

1. Warm cream background (~#F4F1EA) + high-contrast serif + terracotta/clay accent (~#D97757).
2. Near-black background + single neon/acid accent color.
3. Broadsheet layout: hairline rules, zero border-radius, dense newspaper columns, used regardless of content type.
4. "SaaS-card kit": everything chopped into identical rounded cards, one border-radius applied uniformly, the same soft grey box-shadow (`rgba(0,0,0,.1)`) under each, gradient washes as pure decoration.
5. Template chrome: tracked-out ALL-CAPS eyebrow labels above every heading; meta strings joined with middle dots ("A · B · C"); "WORD — fragment" labels with spaced em-dash; near-black standing in for true black (#0B0B0B/#111); monospace for data labels regardless of fit; `→` appended to every link/button.
6. Default font stack: Inter, Roboto, Arial used with no deliberation.
7. Purple gradients as the default "modern SaaS" palette.

## Deliberate choices instead

- **Typography**: pick a display + body pairing intentional to this brief, not a reflexive default. Build a real type scale (sizes, weights, letter-spacing, line-height) and let it carry personality.
- **Color**: build a small token system (2-4 core colors + neutrals) with one accent used with restraint and purpose, not decoration. Express as CSS variables / design tokens, not scattered literals.
- **Structure as information**: numbering, dividers, eyebrow labels, and section markers should encode something true about the content (real sequence, real categorization). If the content isn't actually a sequence, don't number it 01/02/03.
- **Spatial composition**: consider asymmetry, overlap, diagonal flow, and intentional grid-breaking where it serves the content, instead of a uniform centered-card grid by default.
- **Motion**: an orchestrated, purposeful moment (e.g., a single well-timed entrance sequence) usually reads better than scattered per-element fade-ins. Sometimes the senior choice is no animation at all. Always respect `prefers-reduced-motion`.
- **Match complexity to ambition**: a minimal design needs precision (spacing, alignment, type) to read as intentional; a maximalist design needs full follow-through, not one bold gesture surrounded by defaults.
- Process: plan → check the plan against the brief → build → critique the result against the original tells list above before shipping.

## RTL / Persian-specific rules

- Set `dir="rtl"` at the document or subtree root for Persian content; never fake RTL by mirroring individual components with manual `margin-left`/`right` swaps.
- Use **logical CSS properties** everywhere instead of physical ones: `margin-inline-start/end` not `margin-left/right`, `padding-inline`, `inset-inline-start`, `text-align: start/end` not `left/right`, `border-inline-start`. These flip automatically with `dir`.
- Icons that convey direction (arrows, chevrons, "next/back") must be mirrored in RTL; icons with no directional meaning (search, close, checkmark) should not be.
- Typography: use a font with proper Persian/Arabic glyph support and correct joining behavior — **Vazirmatn** is the standard modern choice for Persian UI; don't rely on a Latin-only font falling back to system defaults for Persian text (breaks weight/spacing consistency).
- Numbers: decide deliberately between Latin digits (0-9) and Persian digits (۰-۹) per product convention — many Persian products keep UI numerals Latin for dates/prices while using Persian digits in prose; be consistent, don't mix within one context.
- Dates: use the **Jalali (Solar Hijri) calendar** for Persian-audience products, not Gregorian — use a library (`date-fns-jalali`, `jalaali-js`, or `dayjs` with a Jalali plugin) rather than hand-rolled conversion.
- Test bidi edge cases: mixed Persian/English/number strings, form inputs, and truncation (ellipsis position flips with direction).
- Mirror layout direction for the whole UI (nav, breadcrumbs, progress indicators, carousels move right-to-left) — don't mirror text but leave layout LTR.
