# Graph Report - my-app  (2026-10-03)

## Corpus Check
- Large corpus: 187 files · ~1,507,188 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1716 nodes · 4046 edges · 95 communities (84 shown, 11 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 228 edges (avg confidence: 0.84)
- Token cost: 912,584 input · 0 output

## Community Hubs (Navigation)
- Live Browser Placeholders
- Live Configure Bar UI
- Modern Screenshot Bundle
- Motion Capture & Refine
- Impeccable Build Agents
- Site Intro Example
- Vendored JS Parser
- Live Agent Targeting
- Live Editing Modes
- Adapt/Animate/Audit Refs
- Live Variant Injection
- GSAP Audit Rules
- Live Design Panel Models
- Visitor Modes & Worlds
- CardFilm & Copy
- Live Page Chat
- Film Frames: Path & Doors
- Live Session Recovery SSE
- Scene Rig & Intro
- Motion Project Rules
- Motion Accessibility
- ESLint & Package Config
- GSAP AST Helpers
- Live Session Checkpoints
- GSAP Performance
- Marquee & Motion Design
- audit-gsap CLI
- Layout & Live Variants
- Svelte Anchor Matching
- Shader Proxy Capture
- Card Art & Bug Shots
- audit-svg CLI
- Manual Edit Context
- Film Contact Sheet & Beats
- Astro/Svelte/Vanilla Adapters
- Polish/Onboard/iOS Tests
- TSConfig
- Card Geometry
- Live Session State
- Core GSAP & SVG Refs
- explain-motion CLI
- Annotation Pins
- Inline Copy Edit
- Live DOM Helpers
- Variant Cycling
- Card Back Textures
- Live Cleanup
- Next/React Adapters
- Timeline Reference
- Voice Steering
- Card Stack & Scroll Story
- Parser Callback Runtime
- SVG Loader Example
- Timeline Chain Analysis
- Component Review & Comps
- DESIGN.md Documenter
- Svelte Component Mount
- Doors Geometry
- R3F/Three Adapters
- Source File Loader
- Native Adaptation & Android
- Accepted DOM Recovery
- Steer Focus Guard
- Flip Reference
- Parser Tokenizer
- Craft Floor & Detector Hook
- Placeholder Editing
- Edit Badge Proxies
- Runtime Dependencies
- Dev Dependencies
- Root Layout & Next Config
- GSAP Hook Templates
- Init & PRODUCT.md
- Design Panel Chrome
- Skill Licensing
- Critique Assessment
- Optimize & Overdrive
- Live Ignore Rules
- Impeccable CLI Script
- Minified Helpers A
- Minified Helpers B
- Output Buffer Ops
- Minified Helpers C
- Rollback Ops
- Minified Helpers D
- Parser Entry
- PostCSS Config
- Scaffold file.svg
- Scaffold globe.svg
- Next.js Wordmark
- Vercel Logo
- Scaffold window.svg

## God Nodes (most connected - your core abstractions)
1. `Impeccable SKILL.md` - 40 edges
2. `GSAP Creative Animation Skill` - 39 edges
3. `connectSSE()` - 34 edges
4. `setLiveState()` - 33 edges
5. `resumeSession()` - 33 edges
6. `showToast()` - 31 edges
7. `initGlobalBar()` - 30 edges
8. `el()` - 29 edges
9. `unwrap()` - 27 edges
10. `handleKeyDown()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Five acts: Chosen, Card emerges, The Path, The Doors, Finale` --references--> `Chosen because you are different (hook line)`  [EXTRACTED]
  .impeccable/surfaces/app-page-tsx.md → docs/پژوهشیار چیست؟.pdf
- `Access, not just Discount` --conceptually_related_to--> `Path from knowledge to impact`  [INFERRED]
  docs/پژوهشیار چیست؟.pdf → PRODUCT.md
- `Roadmap-only features (never promised)` --references--> `Achievement-based tiers (more achievement, higher standing; not more money)`  [EXTRACTED]
  PRODUCT.md → docs/پژوهشیار چیست؟.pdf
- `Roadmap-only features (never promised)` --references--> `Pazhoohesh-Yar benefits network (health, travel, education partners)`  [EXTRACTED]
  PRODUCT.md → docs/پژوهشیار چیست؟.pdf
- `Roadmap-only features (never promised)` --references--> `Dedicated credit and installment purchase for equipment`  [EXTRACTED]
  PRODUCT.md → docs/پژوهشیار چیست؟.pdf

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Impeccable build pipeline agents (produce, review, document)** — claude_agents_impeccable_asset_producer_impeccable_asset_producer, claude_agents_impeccable_finish_reviewer_impeccable_finish_reviewer, claude_agents_impeccable_documenter_impeccable_documenter, impeccable_surfaces_app_page_tsx_direction_contract [INFERRED 0.85]
- **Pazhoohesh-Yar joint card partnership** — product_pazhoohesh_yar_card, product_daneshmand_institute, product_bank_sina, product_green_bank [EXTRACTED 1.00]
- **Roadmap benefits worded as paths, never promises** — product_roadmap_only_features, docs_پژوهشیار_چیست_dedicated_credit_bnpl, docs_پژوهشیار_چیست_benefits_network, docs_پژوهشیار_چیست_green_box_asset_backed_liquidity, docs_پژوهشیار_چیست_achievement_based_tiers, docs_پژوهشیار_چیست_digital_identity_profile [INFERRED 0.85]
- **GSAP framework adapters (lifecycle/scope/SSR/per-frame/routes/failures/audit contract)** — claude_skills_gsap_creative_animation_adapter_react, claude_skills_gsap_creative_animation_adapter_next, claude_skills_gsap_creative_animation_adapter_r3f, claude_skills_gsap_creative_animation_adapter_three, claude_skills_gsap_creative_animation_adapter_vanilla, claude_skills_gsap_creative_animation_adapter_vue, claude_skills_gsap_creative_animation_adapter_svelte, claude_skills_gsap_creative_animation_adapter_astro [EXTRACTED 1.00]
- **Intro/loader dismissal race with hard ceiling and CSS exit** — claude_skills_gsap_creative_animation_example_cinematic_intro_ceiling_race, claude_skills_gsap_creative_animation_preset_cinematic_ceiling, claude_skills_gsap_creative_animation_preset_loader_dismissal_race, claude_skills_gsap_creative_animation_preset_cinematic_css_curtain_exit [INFERRED 0.85]
- **gsap.context create/revert lifecycle per framework** — claude_skills_gsap_creative_animation_adapter_react_usegsap, claude_skills_gsap_creative_animation_adapter_vanilla_gsap_context_root, claude_skills_gsap_creative_animation_adapter_vue_onmounted_context, claude_skills_gsap_creative_animation_adapter_svelte_effect_context, claude_skills_gsap_creative_animation_adapter_astro_page_load_before_swap [INFERRED 0.85]
- **Silent-Failure Audit Rules Reported by audit-gsap** — claude_skills_gsap_creative_animation_reference_accessibility_matchmedia_both_conditions, claude_skills_gsap_creative_animation_reference_devices_ungated_hover, claude_skills_gsap_creative_animation_reference_svg_late_transform_origin, claude_skills_gsap_creative_animation_reference_timeline_ambient_loop_handoff, claude_skills_gsap_creative_animation_reference_timeline_stacked_from_immediate_render, claude_skills_gsap_creative_animation_reference_project_rules_waivers_with_reasons [INFERRED 0.85]
- **RTL Mirroring Across Domains** — claude_skills_gsap_creative_animation_reference_project_rules_rtl_mirroring, claude_skills_gsap_creative_animation_reference_svg_motionpath_plugin, claude_skills_gsap_creative_animation_reference_scrolltrigger_horizontal_scroll, claude_skills_gsap_creative_animation_reference_motion_design_stagger_rhythm, claude_skills_gsap_creative_animation_reference_project_rules_physical_anchor_for_measured_marker, claude_skills_gsap_creative_animation_reference_project_rules_css_transform_replaced [EXTRACTED 1.00]
- **Reduced-Motion Strategy via matchMedia** — claude_skills_gsap_creative_animation_reference_accessibility_reduced_motion_as_design, claude_skills_gsap_creative_animation_reference_accessibility_matchmedia_both_conditions, claude_skills_gsap_creative_animation_reference_accessibility_reduced_branch_sets_end_state, claude_skills_gsap_creative_animation_reference_core_gsap_gsap_matchmedia, claude_skills_gsap_creative_animation_reference_devices_full_light_static_tiers, claude_skills_gsap_creative_animation_reference_devices_three_axes [INFERRED 0.85]
- **Impeccable subagent roles run inline when no subagent tool exists** — claude_skills_impeccable_reference_degraded_asset_producer, claude_skills_impeccable_reference_degraded_documenter, claude_skills_impeccable_reference_degraded_finish_reviewer, claude_skills_impeccable_reference_degraded_manual_edit_applier [EXTRACTED 1.00]
- **Comp-led build pipeline: spec, plates, human review, finish review, documentation** — claude_skills_impeccable_reference_component_review_comp_spec, claude_skills_impeccable_reference_degraded_asset_producer_plate, claude_skills_impeccable_reference_component_review_plan_and_asset_review, claude_skills_impeccable_reference_component_review_hero_manifest, claude_skills_impeccable_reference_degraded_finish_reviewer, claude_skills_impeccable_reference_degraded_documenter [INFERRED 0.85]
- **Refine/enhance commands that hand off to /impeccable polish** — claude_skills_impeccable_reference_adapt, claude_skills_impeccable_reference_adapt_native, claude_skills_impeccable_reference_animate, claude_skills_impeccable_reference_bolder, claude_skills_impeccable_reference_polish [EXTRACTED 1.00]
- **Visitor modes governing world expression (Operate, Persuade/Experience, Read)** — claude_skills_impeccable_reference_mode_operate_operate_mode, claude_skills_impeccable_reference_mode_persuade_persuade_mode, claude_skills_impeccable_reference_mode_read_read_mode, claude_skills_impeccable_reference_new_work_concept_seed_roll [EXTRACTED 1.00]
- **Scoped commands that hand off to /impeccable polish** — claude_skills_impeccable_reference_layout, claude_skills_impeccable_reference_typeset, claude_skills_impeccable_reference_quieter, claude_skills_impeccable_reference_onboard, claude_skills_impeccable_reference_optimize, claude_skills_impeccable_reference_polish [EXTRACTED 1.00]
- **New-surface pipeline: init -> shape -> new-work -> visualize -> region map** — claude_skills_impeccable_reference_init, claude_skills_impeccable_reference_shape, claude_skills_impeccable_reference_new_work, claude_skills_impeccable_reference_visualize, claude_skills_impeccable_reference_region_map [EXTRACTED 1.00]
- **Film beat sequence: credits -> blade -> card -> circuit path -> doors -> finale CTA** — impeccable_review_desktop_letterbox_credits_intro, impeccable_review_desktop_light_blade, impeccable_review_desktop_pazhooheshyar_card, impeccable_review_desktop_circuit_path_milestones, impeccable_review_desktop_doors_sequence, impeccable_review_desktop_final_cta_knowledge_to_impact [INFERRED 0.85]
- **Final desktop review frames t0.9-t17.2** — impeccable_review_final_desktop_t00_9_credits, impeccable_review_final_desktop_t02_6_chosen, impeccable_review_final_desktop_t03_7_blade, impeccable_review_final_desktop_t06_5, impeccable_review_final_desktop_t09_8, impeccable_review_final_desktop_t13_4, impeccable_review_final_desktop_t17_2 [EXTRACTED 1.00]
- **Persistent navigation chrome over the film** — impeccable_review_desktop_chapter_rail, impeccable_review_desktop_enter_path_cta, impeccable_review_desktop_scroll_driven_film [INFERRED 0.85]
- **Desktop film chapter progression: Path -> Doors -> Impact finale** — impeccable_review_final_desktop_t21_4_frame, impeccable_review_final_desktop_t25_6_frame, impeccable_review_final_desktop_t28_0_frame, impeccable_review_final_desktop_t30_4_frame, impeccable_review_final_desktop_t32_8_frame, impeccable_review_final_desktop_t36_2_frame, impeccable_review_final_desktop_t39_9_frame [INFERRED 0.95]
- **Mobile intro: credits -> title card -> blade reveal -> Emergence -> Pazhoheshyar chapter** — impeccable_review_final_mobile_t00_9_credits_frame, impeccable_review_final_mobile_t02_6_chosen_frame, impeccable_review_final_mobile_t03_7_blade_frame, impeccable_review_final_mobile_t06_5_frame, impeccable_review_final_mobile_t09_8_frame [INFERRED 0.95]
- **Visual defects flagged in final review frames** — impeccable_review_final_desktop_t21_4_caption_clipping_defect, impeccable_review_final_desktop_t32_8_bloom_washout_defect, impeccable_review_final_desktop_t36_2_dead_frame_gap [INFERRED 0.75]
- **Pazhoohyar card texture/material set** — public_images_card_front, public_images_card_back, public_images_circuit_mask, public_images_final_app_front, public_images_final_app_back [INFERRED 0.85]
- **Dark fintech card-hero moodboard** — public_images_idea_5, public_images_idea_image, public_images_idea_image1, public_images_idea_image2, public_images_idea_image3, public_images_idea_image4, public_images_idea_image6 [INFERRED 0.85]
- **Unused create-next-app scaffold icons** — public_file, public_globe, public_next, public_vercel, public_window [INFERRED 0.75]
- **WebP PBR texture set for card model (front/back color, normal, ORM + emissive)** — public_gltf_textures_front_color, public_gltf_textures_front_normal, public_gltf_textures_front_orm, public_gltf_textures_core_emissive, public_gltf_textures_back_color, public_gltf_textures_back_normal, public_gltf_textures_back_orm [INFERRED 0.85]
- **PNG PBR texture set for card model (older variant, no emissive circuit layer)** — public_gltf_textures_card_front, public_gltf_textures_card_front_normal, public_gltf_textures_card_front_orm, public_gltf_textures_card_back, public_gltf_textures_card_back_normal, public_gltf_textures_card_back_orm [INFERRED 0.85]

## Communities (95 total, 11 thin omitted)

### Community 0 - "Live Browser Placeholders"
Cohesion: 0.05
Nodes (65): applyGlobalBarLabelState(), applyLiveBarPreference(), applyParamValue(), applyPlaceholderSizingStyles(), bufferToBase64(), buildInsertPlaceholderSnapshotFromDom(), buildPickedAnchorSnapshot(), buildPlaceholderResizeHandles() (+57 more)

### Community 1 - "Live Configure Bar UI"
Cohesion: 0.06
Nodes (65): actionLabel(), agentStatusText(), barPaletteForTheme(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), brandMarkSvg(), buildConfigureActionControl() (+57 more)

### Community 2 - "Modern Screenshot Bundle"
Cohesion: 0.08
Nodes (58): oi(), a(), n(), ae(), be(), bt(), Ce(), s() (+50 more)

### Community 3 - "Motion Capture & Refine"
Cohesion: 0.07
Nodes (49): Refine Reference, Fix Order: Lifecycle, Accessibility, Performance, Composition, Rhythm, Generate -> Audit -> Fix -> Re-run -> Tune Loop, Verification Section: Observed Values, Not Verbs, Verify a Claim Before Fixing, asNumber(), boxOf(), capture() (+41 more)

### Community 4 - "Impeccable Build Agents"
Cohesion: 0.06
Nodes (50): Notice: this is NOT the Next.js you know, Measured spec (.impeccable/build/spec.json), Human plan and asset review checkpoint, Decision Comps job (one card, one comp), Impeccable Asset Producer agent, Raster plate (region regenerated at >=1.5x), Transparent cutout vs opaque plate, DESIGN.md and sidecar (+42 more)

### Community 5 - "Site Intro Example"
Cohesion: 0.06
Nodes (45): Data and copy passed down as props, gsap.matchMedia motion/reduced branches, Example: Site Intro, Artwork as a prop from a Server Component, Hard ceiling, dismissal as a race, Generated SVG geometry via project script, Shared 'write' label for dot run and letter stagger, repeat:-1 child makes timeline endless; hand over via .call at a position (+37 more)

### Community 6 - "Vendored JS Parser"
Cohesion: 0.05
Nodes (16): activateCallbacks(), Ae(), ai(), begin(), Ci(), Ct(), De(), Is() (+8 more)

### Community 7 - "Live Agent Targeting"
Cohesion: 0.11
Nodes (43): actOnAgentTarget(), agentTargetBusyReason(), agentTargetOverlayGone(), agentTargetTaken(), claimAgentTarget(), claimAndActOnAgentTarget(), clearStoredManualApplyState(), declineAgentTargetBusy() (+35 more)

### Community 8 - "Live Editing Modes"
Cohesion: 0.14
Nodes (42): beginNewLiveConfiguration(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), clearAnnotations(), clearInsertPicking(), closeTunePopover(), disableInlineEdit() (+34 more)

### Community 9 - "Adapt/Animate/Audit Refs"
Cohesion: 0.07
Nodes (41): adapt.md (responsive adaptation), Content-driven breakpoints, Detect input method (pointer/hover), not screen size, Mobile-first CSS, Responsive images (srcset, picture art direction), Safe areas / notch handling, animate.md (motion), Motion thesis (focal moment, continuity, feedback, budget) (+33 more)

### Community 10 - "Live Variant Injection"
Cohesion: 0.11
Nodes (40): applyParamDefaults(), closedClipPath(), commitAcceptedVariantToDom(), completeParameterGenerationIfReady(), completeParameterPublication(), completeSourceInjection(), ensureInsertPlaceholder(), findInsertAnchorInDom() (+32 more)

### Community 11 - "GSAP Audit Rules"
Cohesion: 0.12
Nodes (32): ancestorsOf(), calleeName(), contains(), findAll(), gsapContexts(), isFunction(), keyName(), resolveFunction() (+24 more)

### Community 12 - "Live Design Panel Models"
Cohesion: 0.08
Nodes (35): buildCollapsible(), buildColorModels(), buildListHtml(), buildRadiiModels(), buildTypographyModels(), copyToClipboard(), cssSafe(), designEmptyMessage() (+27 more)

### Community 13 - "Visitor Modes & Worlds"
Cohesion: 0.09
Nodes (34): buildPath workflow setting (comp-first vs code-first), Operate mode rules, Costume anti-pattern (tool/instrument world on working screen), World lends only type, palette, density, signature move, Operate visitor mode, Signature move, Persuade and Experience mode rules, Single-object rule (+26 more)

### Community 14 - "CardFilm & Copy"
Cohesion: 0.10
Nodes (23): allCaptions, CardFilm(), captions, credits, doors, finale, hook, shots (+15 more)

### Community 15 - "Live Page Chat"
Cohesion: 0.14
Nodes (30): agentHasWorkInFlight(), armPageChatForTyping(), buildSteerProcessingDots(), buildSteerQueueHint(), clearSteerAwaitTimer(), collapsePageChat(), expandPageChat(), focusPageChatInput() (+22 more)

### Community 16 - "Film Frames: Path & Doors"
Cohesion: 0.09
Nodes (27): Caption text clipped at card edge (market / capital labels cut off), Left vertical chapter rail (scroll progress dots with active label), Glowing circuit-trace path across card surface, Persistent top-right 'Enter the path' outline CTA, Desktop t21.4 - Path chapter: circuit trace lights card, caption clipped, Desktop t25.6 - Path chapter end: trace reaches chip, 'from knowledge to impact' caption occluded, Desktop t28.0 - Doors chapter: card in front of nested door outlines, 'Pazhoheshyar designed to accompany this path' headline, Pazhoheshyar (Daneshmand) 3D card hero object (+19 more)

### Community 17 - "Live Session Recovery SSE"
Cohesion: 0.14
Nodes (25): abandonForeignSession(), abandonSupersededGo(), connectSSE(), discardOrphanedSession(), findLiveElementForSvelteManifest(), handleDiscard(), injectSvelteComponentsFromManifest(), injectVariantsFromSource() (+17 more)

### Community 18 - "Scene Rig & Intro"
Cohesion: 0.13
Nodes (19): createRig(), Scene, bokehGLSL, clock, cocGLSL, lens, chosenAt(), easeInOut() (+11 more)

### Community 19 - "Motion Project Rules"
Cohesion: 0.10
Nodes (25): WCAG 2.3.1 Three Flashes Limit, Stagger Rhythm (each vs amount), Project Rules Reference, ANIMATION.md Project Rules File, GSAP Transform Replaces CSS Transform, Deriving Rules Without a File (lint, colour, direction, house language), Templates Under Dot-Directories Are Not Typechecked, Motion Budget (+17 more)

### Community 20 - "Motion Accessibility"
Cohesion: 0.10
Nodes (24): Accessibility Reference, Loader/Artwork Announcement (role=status vs aria-hidden), Current-State Marker Contrast (WCAG 1.4.11 + aria-current), Focus Ring and Hover/Focus Parity, Gate Hover on (hover: hover) and (pointer: fine), matchMedia Requires Both Motion Conditions, Reduced Branch Must Set End State, Reduced Motion Is a Design (+16 more)

### Community 21 - "ESLint & Package Config"
Cohesion: 0.09
Nodes (22): eslintConfig, name, packageManager, private, scripts, build, dev, lint (+14 more)

### Community 22 - "GSAP AST Helpers"
Cohesion: 0.11
Nodes (22): argumentObject(), FUNCTIONS, isGsapCall(), isNode(), isReference(), moduleSource(), ON_ANYTHING, ON_GSAP (+14 more)

### Community 23 - "Live Session Checkpoints"
Cohesion: 0.16
Nodes (23): applySavedSessionMeta(), checkpointPayload(), clampVariantIndex(), enterRecoveryWaitingForAnchor(), findActiveSessionSummary(), findAdoptableServerSession(), findAnyVariantsWrapper(), isFrameworkComponentPreviewMode() (+15 more)

### Community 24 - "GSAP Performance"
Cohesion: 0.10
Nodes (22): Subpath Plugin Imports and registerPlugin, Tweening Timeline Progress to Smooth External Values, Performance Reference, GSAP Bundle Size and Subpath Loading, Filter/Blur Cost and Alternatives, Frame Budget at 60/120/165Hz, Measure in Milliseconds, Not Frames, top:50% vs yPercent Swap Asymmetry (+14 more)

### Community 25 - "Marquee & Motion Design"
Cohesion: 0.11
Nodes (21): Marquee and Ambient Preset, Irregular ambient float (sine.inOut yoyo), Pause off-screen loops via ScrollTrigger onToggle, Scroll-velocity-reactive marquee speed, Seamless marquee (duplicate copy, function x, width-derived duration), WCAG 2.2.2 pause on hover/focus, Motion Design Reference, Duration Bands (+13 more)

### Community 26 - "audit-gsap CLI"
Cohesion: 0.12
Nodes (18): argv, asJson, findings, ICON, ORDER, paths, quiet, registered (+10 more)

### Community 27 - "Layout & Live Variants"
Cohesion: 0.12
Nodes (21): Impeccable Manual Edit Applier (degraded inline role), Entry atomicity (all ops or none), generate.md (live variants fast lane), impeccable live-generate fast lane, Layout command reference, Live-mode density signature param, Spatial thesis, Squint test (+13 more)

### Community 28 - "Svelte Anchor Matching"
Cohesion: 0.14
Nodes (21): applyOriginalAttrsToSvelteAnchor(), buildSvelteExpressionTextMap(), buildSveltePropValuesFromLiveElement(), buildSveltePropValuesV2(), cloneWithoutElements(), collectTextNodes(), collectVisibleTexts(), cssEscapeIdent() (+13 more)

### Community 29 - "Shader Proxy Capture"
Cohesion: 0.12
Nodes (20): averageRgb01(), captureChromeNodes(), captureElementFromRenderedAncestor(), captureElementToBlob(), compileShader(), cssColorToRgb01(), dominantRgb01(), findBackdropAncestor() (+12 more)

### Community 30 - "Card Art & Bug Shots"
Cohesion: 0.13
Nodes (21): Bug Screenshot: Card with Orbit Rings and Callouts, Orbit Rings + Feature Callouts Scene, Bug Screenshot: Card Specular Sweep and Tagline, Tagline: Banking, Differently, Brushed Metal Surface Finish, Card Back Texture (webp), Card Front Texture (webp), Circuit Mask (emissive/alpha map) (+13 more)

### Community 31 - "audit-svg CLI"
Cohesion: 0.15
Nodes (19): argv, attrs(), audit(), checkHues, compareMorph(), describe(), files, hues() (+11 more)

### Community 32 - "Manual Edit Context"
Cohesion: 0.12
Nodes (20): addManualContextText(), canRestoreManualEditElement(), collectManualContextPieces(), walk(), contextElementForManualEdit(), cssIdent(), directMixedTextRestoreNodes(), findManualEditRestoreElement() (+12 more)

### Community 33 - "Film Contact Sheet & Beats"
Cohesion: 0.15
Nodes (20): Desktop Film Contact Sheet (14 frames), Chapter Progress Rail (Emergence / Pazhooheshyar / Path / Doors / Impact), Circuit Path Milestones (Talent, Capital, Technology, Market, Business), Doors Sequence (nested glowing portals: research / visibility opportunities), 'Enter the Path' Persistent CTA Button, Finale 'From Knowledge, to Impact' + Enter Pazhooheshyar Path CTA, Letterboxed Credits Intro (starfield, presenter line: R&D Institute / Bank Sina / Greenbank), Light Blade (glowing vertical bar, card seen edge-on) (+12 more)

### Community 34 - "Astro/Svelte/Vanilla Adapters"
Cohesion: 0.15
Nodes (19): Astro Adapter, client:* hydration timing (prefer client:load for entrances), astro:page-load build / astro:before-swap revert, Per-instance plugin ids via useId(), React-specific audit rules (orphan-tween, state-per-event, shared-plugin-id), Svelte/SvelteKit Adapter, data-* targets (compiler rewrites class selectors), $effect/onMount gsap.context with returned revert (+11 more)

### Community 35 - "Polish/Onboard/iOS Tests"
Cohesion: 0.15
Nodes (19): iOS slop test (ported-from-a-website tell), Simulator screenshot verification (xcrun simctl), Onboard command reference, Empty state design, Time to value / aha moment, Operate mode depth (and Read notes), Full interactive state set, Product slop test (earned familiarity) (+11 more)

### Community 36 - "TSConfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 37 - "Card Geometry"
Cohesion: 0.17
Nodes (16): buildNetwork(), Card(), CARD_W, FACE_Z, faceGeometry(), patchFace(), Rig, roundedRect() (+8 more)

### Community 38 - "Live Session State"
Cohesion: 0.22
Nodes (15): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+7 more)

### Community 39 - "Core GSAP & SVG Refs"
Cohesion: 0.18
Nodes (17): Core Gsap Reference, Named Eases and CustomEase, gsap.context (scope and revert), gsap.matchMedia, gsap.utils Helpers, Context Scope Does Not Reach Plugin Config, contextSafe Is matchMedia's Second Argument, Three Device Axes: Layout, Input, Motion Tier (+9 more)

### Community 40 - "explain-motion CLI"
Cohesion: 0.29
Nodes (16): main(), parseArguments(), positionOf(), readFile(), reasonFor(), reportFile(), reportPage(), startOf() (+8 more)

### Community 41 - "Annotation Pins"
Cohesion: 0.20
Nodes (17): beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), clampPlaceholderSize(), finalizeEditingPin(), initAnnotOverlay(), localCoords() (+9 more)

### Community 42 - "Inline Copy Edit"
Cohesion: 0.13
Nodes (17): collectEditableTextRows(), visit(), copyEditContainerContext(), copyEditLeafContext(), documentRefClassSuffix(), documentRefForElement(), documentRefIdSuffix(), documentRefSegment() (+9 more)

### Community 43 - "Live DOM Helpers"
Cohesion: 0.16
Nodes (12): createLiveBrowserDomHelpers(), activeElementDeep(), cssId(), liveUiRoot(), makeFrozenAnchor(), own(), pickable(), rectIsUsableAnchor() (+4 more)

### Community 44 - "Variant Cycling"
Cohesion: 0.20
Nodes (16): buildCyclingRow(), captureAndEmit(), clearMountErrorCard(), cycleVariant(), cyclingCounterText(), cyclingShownVariant(), dismissToast(), ensureCyclingRenderable() (+8 more)

### Community 45 - "Card Back Textures"
Cohesion: 0.18
Nodes (16): back_color.webp (card back base color, navy brushed metal, black magstripe, Green Bank logo), Green Bank (گرین بانک) logo on card back, back_normal.webp (card back tangent normal map, brushed grain + embossed logo), back_orm.webp (card back occlusion/roughness/metallic packed map), card_back.png (card back base color, PNG variant), card_back_normal.png (card back normal map, PNG variant, no embossed logo), card_back_orm.png (card back ORM map, PNG variant, zero metallic), card_front.png (card front base color, PNG variant) (+8 more)

### Community 46 - "Live Cleanup"
Cohesion: 0.27
Nodes (15): abortSvelteComponentInjection(), cleanup(), cleanupAcceptedSession(), clearHandled(), clearScrollY(), clearSession(), handleServerLost(), hideShaderOverlay() (+7 more)

### Community 47 - "Next/React Adapters"
Cohesion: 0.22
Nodes (14): Next.js Adapter, Animate a wrapper around next/image; wait for load; measure LCP, App Router transition options (entrance only / layout overlay / router.push behind timeline), 'use client' leaf component, Server Component cost pricing, React Adapter, contextSafe for handler-created tweens, { scope: root } selector scoping, ScrollTrigger.refresh() after navigation settles (+6 more)

### Community 48 - "Timeline Reference"
Cohesion: 0.15
Nodes (14): gsap.to / from / fromTo / set, Hover With a Paused Timeline, Overlap at 60-75% of Previous Beat, Number Counters with Tabular Figures, Timeline Reference, Ambient Loop Handed Off After the Scene, Empty Tween Holds, Labels as Structural Commitments (+6 more)

### Community 49 - "Voice Steering"
Cohesion: 0.23
Nodes (14): applyConfigureBarChrome(), configureVoiceContext(), finishVoiceSession(), isEmbeddedPreviewBrowser(), releaseVoiceEngine(), startVoice(), steerSpeechRecognitionCtor(), steerVoiceErrorMessage() (+6 more)

### Community 50 - "Card Stack & Scroll Story"
Cohesion: 0.15
Nodes (13): Card Stack Preset, Deal in (random rotation, stagger amount), Flip reflow on filter, Hover lift with shadow, Stacking on scroll (pin per card, pinSpacing:false), Pointer tilt via quickTo rotationX/Y, Shared element via Flip (data-flip-id), One ScrollTrigger per group with stagger (+5 more)

### Community 51 - "Parser Callback Runtime"
Cohesion: 0.23
Nodes (13): appendOutput(), captureCallbacks(), close(), commit(), constructor(), currentFrame(), deactivateCallbacks(), emit() (+5 more)

### Community 52 - "SVG Loader Example"
Cohesion: 0.20
Nodes (12): Example: SVG Logo Loader, Loader component, Dot/dash morph pair authored with identical node structure, RTL by reversing motionPath start/end, Two layers of one geometry (stroked outline + fill), viewBox contains the orbit, not just the ink, Loader Preset, Determinate progress via tweened timeline progress (+4 more)

### Community 53 - "Timeline Chain Analysis"
Cohesion: 0.39
Nodes (12): chainReceiver(), chainStart(), dottedName(), keptUnder(), methodName(), numberValue(), timelineLinks(), unwrap() (+4 more)

### Community 54 - "Component Review & Comps"
Cohesion: 0.23
Nodes (12): component-review.md (plan and asset review), impeccable comp-spec measured spec (.impeccable/build/spec.json), impeccable component-review plan/capture/serve/verify, Hero first-viewport review manifest (schemaVersion 2), Plan and asset review checkpoint, Impeccable Asset Producer (degraded inline role), Decision comps job (one card, one file), Plate: raster region regenerated at asset resolution (+4 more)

### Community 55 - "DESIGN.md Documenter"
Cohesion: 0.20
Nodes (12): Impeccable Documenter (degraded inline role), Shipped build is ground truth for the design system, Never canonize a craft-floor refusal into DESIGN.md, doctor.md (artifact drift repair), Drift types: tool version / schema drift / truth drift, Severity-driven actions (auto / mention / decide), document.md (DESIGN.md generation), DESIGN.md sidecar .impeccable/design.json (+4 more)

### Community 56 - "Svelte Component Mount"
Cohesion: 0.26
Nodes (12): commitAcceptedSvelteComponentToDom(), componentModuleCandidates(), describeMountFailure(), detectDevServerBase(), getMountedSvelteComponentAnchor(), importFirstReachable(), isSvelteInsertManifest(), loadSvelteRuntime() (+4 more)

### Community 57 - "Doors Geometry"
Cohesion: 0.25
Nodes (10): CARD_H, DOOR_H, DOOR_W, Doors(), halfGeometry(), halfShape(), outlineGeometry(), U (+2 more)

### Community 58 - "R3F/Three Adapters"
Cohesion: 0.22
Nodes (11): React Three Fiber Adapter, Dynamic canvas import with fallback (also reduced-motion design), invalidate from onUpdate with frameloop='demand', useFrame for clock-following logic, GSAP for state transitions, quickTo refs instead of React state per frame, Three.js Adapter, GSAP as orchestration layer, Three as renderer, Proxy tween + camera.lookAt from onUpdate (+3 more)

### Community 59 - "Source File Loader"
Cohesion: 0.27
Nodes (9): parse(), fromText(), load(), opensString(), scriptsOnly(), SKIP_DIRECTORIES, SOURCE_EXTENSIONS, stripComments() (+1 more)

### Community 60 - "Native Adaptation & Android"
Cohesion: 0.22
Nodes (11): adapt.native.md (native adaptation), iOS to Android idiom translation (translate, never transplant), Restructure, don't stretch (phone to tablet), Size classes / window size classes drive structure, android.md (Android platform), Emulator/device screenshot verification via adb, Android slop test (iOS app wearing Android skin), Dynamic Color (Material You) (+3 more)

### Community 61 - "Accepted DOM Recovery"
Cohesion: 0.31
Nodes (11): acceptedDomAlreadyClean(), clearHandledWrapperReloadStamp(), deferredRecoverySuperseded(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), handledWrapperReloadKey(), reloadAfterMissingAcceptedDom(), restoreAcceptedDomFromSnapshot() (+3 more)

### Community 62 - "Steer Focus Guard"
Cohesion: 0.29
Nodes (11): attachSteerFocusDebug(), attachSteerFocusGuard(), clearSteerFocusRecoverTimer(), focusConfigureInput(), notePagePointerDown(), pageHasHostTextSelection(), scheduleSteerFocusRecover(), shouldFocusSteerChat() (+3 more)

### Community 63 - "Flip Reference"
Cohesion: 0.27
Nodes (10): autoAlpha (opacity + visibility), Flip Reference, data-flip-id Shared Element Matching, Flip.fit, Flip Options: absolute, scale, nested, onEnter/onLeave, Flip Plugin (getState / from), When Not to Use Flip, Held Height Stretches Grid Rows (align-content) (+2 more)

### Community 65 - "Craft Floor & Detector Hook"
Cohesion: 0.27
Nodes (10): craft-floor.md (quality floor), Theme browser surfaces (selection, caret, scrollbars, focus rings), Kicker / eyebrow ban, Craft floor Refuse list (category defaults), Craft floor verify checks (contrast, depth, spacing, type, motion, states), Assessment B: detector + browser evidence sub-agent, hooks.md (design detector hook), Design detector hook (post-tool-use) (+2 more)

### Community 66 - "Placeholder Editing"
Cohesion: 0.22
Nodes (10): applyEditing(), applyPlaceholderDimensions(), buildLocatorForLeaf(), finalizeInsertSession(), forbiddenManualTextChars(), maybeShowFirstSaveToast(), positionAnnotOverlay(), removeInsertPlaceholderDom() (+2 more)

### Community 67 - "Edit Badge Proxies"
Cohesion: 0.27
Nodes (10): bindEditBadgeProxy(), editBadgeProxyTargets(), initEditBadge(), initEditBadgeHitProxies(), positionEditBadge(), proxyMouseEvent(), setImportantStyle(), styleEditBadgeProxy() (+2 more)

### Community 68 - "Runtime Dependencies"
Cohesion: 0.20
Nodes (10): dependencies, gsap, @gsap/react, next, react, react-dom, @react-three/fiber, @theatre/core (+2 more)

### Community 69 - "Dev Dependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+2 more)

### Community 70 - "Root Layout & Next Config"
Cohesion: 0.22
Nodes (6): app_globals, display, metadata, text, nextConfig, next

### Community 71 - "GSAP Hook Templates"
Cohesion: 0.32
Nodes (4): TIMING, gsap, @gsap/react, react

### Community 72 - "Init & PRODUCT.md"
Cohesion: 0.36
Nodes (8): craft.md (deprecated alias), Init flow (PRODUCT.md capture), Init completion gate, Platform value (web/ios/android/adaptive), PRODUCT.md product record, impeccable:product-schema version marker, iOS platform reference, Dynamic Type and system text styles

### Community 73 - "Design Panel Chrome"
Cohesion: 0.39
Nodes (8): buildDesignHeader(), designPanelCss(), fetchDesignSystem(), initDesignPanel(), loadDesignPrefs(), renderDesignChrome(), saveDesignPrefs(), toggleDesignPanel()

### Community 74 - "Skill Licensing"
Cohesion: 0.38
Nodes (7): Skill Notice (Licensing), acorn (MIT), GSAP Standard License (Webflow), MIT License (skill), @sveltejs/acorn-typescript (MIT), scripts/lib/vendor/parser.mjs (bundled JS/TS parser), GSAP 100% free since 3.13 (all Club plugins)

### Community 75 - "Critique Assessment"
Cohesion: 0.43
Nodes (7): critique.md (UX design review), Assessment A: design review sub-agent, Cognitive load assessment, Critique snapshot persistence (critique-storage), DEGRADED single-context banner, Nielsen heuristics scoring guide, Persona-based design testing

### Community 76 - "Optimize & Overdrive"
Cohesion: 0.29
Nodes (7): Optimize command reference, Core Web Vitals (LCP, INP, CLS), Layout thrashing avoidance (batch reads/writes), Overdrive command reference, Progressive enhancement (non-negotiable), Propose 2-3 directions before building, Wow / removal / device / context tests

### Community 77 - "Live Ignore Rules"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 78 - "Impeccable CLI Script"
Cohesion: 0.60
Nodes (5): impeccable script, check_download(), fetch_url(), probe_ok(), setup_help()

### Community 79 - "Minified Helpers A"
Cohesion: 0.40
Nodes (4): bi(), ki(), mi(), xi()

### Community 80 - "Minified Helpers B"
Cohesion: 0.40
Nodes (5): ht(), it(), te(), Xs(), Ys()

### Community 81 - "Output Buffer Ops"
Cohesion: 0.50
Nodes (4): append(), truncate(), willAppend(), willMutateTail()

### Community 82 - "Minified Helpers C"
Cohesion: 0.50
Nodes (4): Je(), Wt(), Xe(), zs()

### Community 83 - "Rollback Ops"
Cohesion: 0.67
Nodes (4): restore(), rollback(), rollbackWithEvents(), unwind()

### Community 84 - "Minified Helpers D"
Cohesion: 0.67
Nodes (3): dt(), Gs(), ge()

## Ambiguous Edges - Review These
- `t2.6 Starfield + Bright Star, 'presents' line (credits dissolve)` → `Light Blade (glowing vertical bar, card seen edge-on)`  [AMBIGUOUS]
  .impeccable/review/final/desktop/t02.6-chosen.png · relation: conceptually_related_to
- `Bloom washout lowers CTA and chapter rail contrast` → `Mostly empty transition frame before finale`  [AMBIGUOUS]
  .impeccable/review/final/desktop/t36.2.png · relation: conceptually_related_to
- `Pazhoohyar Daneshmand Card (Bank Sina x Sina VC)` → `Gerin Bank Logo on Card Back`  [AMBIGUOUS]
  public/images/card-back.webp · relation: conceptually_related_to
- `Pazhooheshyar Daneshmand bank card (Bank Sina + Sina VC co-brand)` → `Green Bank (گرین بانک) logo on card back`  [AMBIGUOUS]
  public/gltf/textures/back_color.webp · relation: conceptually_related_to

## Knowledge Gaps
- **260 isolated node(s):** `ROOT`, `argv`, `asJson`, `quiet`, `targets` (+255 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 376 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `t2.6 Starfield + Bright Star, 'presents' line (credits dissolve)` and `Light Blade (glowing vertical bar, card seen edge-on)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Bloom washout lowers CTA and chapter rail contrast` and `Mostly empty transition frame before finale`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Pazhoohyar Daneshmand Card (Bank Sina x Sina VC)` and `Gerin Bank Logo on Card Back`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Pazhooheshyar Daneshmand bank card (Bank Sina + Sina VC co-brand)` and `Green Bank (گرین بانک) logo on card back`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Refine Reference` connect `Motion Capture & Refine` to `Site Intro Example`, `explain-motion CLI`, `Motion Project Rules`, `Marquee & Motion Design`, `audit-gsap CLI`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `GSAP Creative Animation Skill` connect `Site Intro Example` to `Astro/Svelte/Vanilla Adapters`, `Motion Capture & Refine`, `Skill Licensing`, `Next/React Adapters`, `Card Stack & Scroll Story`, `Motion Project Rules`, `SVG Loader Example`, `Marquee & Motion Design`, `R3F/Three Adapters`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `k()` connect `Modern Screenshot Bundle` to `CardFilm & Copy`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._