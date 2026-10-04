# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Members of the community selected by مؤسسه تحقیق و توسعه دانشمند (the Daneshmand R&D institute): prize winners, researchers, technologists, and teams the institute supports. The first pilot audience is the winners of the institute's «راهی‌شو» program. The page introduces the card to them and to the people around the program.

The page is member-facing: it speaks in the voice of the brochure (`docs/پژوهشیار چیست؟`, second person, «متن پیشنهادی بروشور»). The partnership proposal (`docs/پژوهش یار دانشمند`) is the partners' document; its phases, roles and economics stay off this page.

## Product Purpose

Introduce «پژوهش‌یار» (Pazhoohesh-Yar): a joint bank card from Daneshmand, Bank Sina and Green Bank (گرین‌بانک). Phase one pays Daneshmand's prizes, research stipends (پژوهانه), grants and other support to the people Daneshmand selects. The page is a cinematic, scroll-driven film and ends in one action.

## Positioning

- The card is not "a better bank card". The source docs reject that framing outright: it makes the project "too banking".
- It is the financial companion of a path: talent → research → technology → capital → market → business → impact. Its lines are «از دانش، تا اثر» and «پژوهش‌یار؛ همراه مالی مسیر دانش تا اثر».
- It is issued only to people Daneshmand selects: «پژوهش‌یار؛ امتیازِ انتخاب شدن», «انتخاب شده‌اید، چون متفاوتید».
- Its value is access, not discounts: «باید به شما دسترسی بدهد؛ نه فقط تخفیف».
- Daneshmand owns the program, the community and the support policy. Green Bank and Bank Sina provide the financial infrastructure.

## Capabilities and Constraints

- Single landing page, Persian, right-to-left.
- Stack: Next.js 16 (App Router), React 19, three, @react-three/fiber 9, @theatre/core + @theatre/studio 0.7, GSAP 3.15.
- Confirmed for phase one: the card is issued to Daneshmand's selected people and used to pay prizes, stipends, grants and support. «راهی‌شو» is the first pilot.
- Roadmap only, never stated as available:
  - staged milestone payments
  - targeted sub-accounts
  - credit and BNPL for equipment
  - a partner benefits network
  - Green-Box savings
  - asset-backed liquidity
  - crowdfunding
  - impact dashboards
  - achievement-based tiers

  The docs phrase all of these as "می‌تواند" or "در صورت…"; the page may describe the path but must not promise them.
- The card is not publicly requestable. Any "request card" CTA is wrong. The CTA destination is undecided (placeholder).
- The real card is coming as a glTF/Blender model; until then it is built from the artwork PNGs and must be swappable.

## Brand Commitments

- Name: «پژوهش‌یار» (written with a ZWNJ). The card's calligraphy reads «پژوهشیار» over «دانشمند»; «دانشمند» is the institute's name.
- Partners: مؤسسه تحقیق و توسعه دانشمند, بانک سینا, گرین‌بانک. Front logos: Bank Sina and Sina VC; back logo: Green Bank.
- Card material: dark navy brushed metal with engraved circuit traces and a light-blue accent panel.
- An interactive product film, not a banking landing page. No conventional navbar.

## Evidence on Hand

- `docs/پژوهش یار دانشمند.docx` / `.pptx`: the strategic partnership proposal (program logic, phases, 90-day pilot).
- `docs/پژوهشیار چیست؟.docx` / `.pdf`: member-facing explanation and brochure copy. This is the approved source for page copy.
- `public/images/final app front.png`, `public/images/final app back.png`: card artwork. `public/images/circuit-mask.png` is traced from the front.
- There are no testimonials, member counts, amounts or fees; do not invent them.

## Product Principles

1. The card is the hero, and the path is its meaning: show the journey from knowledge to impact, don't list features.
2. Being chosen is the emotional core; the page should make the visitor feel selected, not sold to.
3. Promise only phase one; everything else is a path, worded as the docs word it.
4. One decision at the end.
