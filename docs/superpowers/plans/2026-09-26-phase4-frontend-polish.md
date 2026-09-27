# Site Refresh — Phase 4: Frontend Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site feel smoother and more modern without changing its layout, format, monochrome palette, or the project popover's behavior.

**Architecture:** Progressive enhancement only. Page-to-page motion uses native cross-document View Transitions (CSS `@view-transition { navigation: auto; }` plus `view-transition-name` on a few shared elements), which keeps full page loads, so every inline script in `BaseLayout.astro` and the popover's scroll pinning run exactly as today. No Astro `<ClientRouter />` (it would turn navigations into client-side swaps and change the popover's behavior). Other changes are CSS and small component tweaks.

**Tech Stack:** Astro 5, Tailwind 4, React 19 island (`ProjectSpotlight.tsx`), `@google/model-viewer`.

**Spec:** `docs/superpowers/specs/2026-09-25-site-refresh-design.md` §4 (including the frozen popover behavior list)

## Global Constraints

- Framing (Rodolfo): this is a personal website that also serves as a portfolio. It should read and feel like a person's site first (who he is, what he builds, what he does outside work), with the projects as the portfolio inside it, not a product landing page or a recruiter pitch.
- Popover behavior is frozen (spec §4): real home page behind with blurred backdrop; background shown at the source scroll position (`sessionStorage` `rr-bg-scroll`, body `position: fixed`); body scroll lock with internal `overscroll-contain` scroll; backdrop click and close button close; Escape always returns to `/#projects`; 220 ms entry animation `cubic-bezier(0.16, 1, 0.3, 1)`, 10 px rise + 0.99 scale, none under reduced motion; same presentation on mobile and desktop.
- Palette, fonts (Geist), grid texture, section order, and component layout stay. No new colors.
- Every motion change is disabled or reduced under `prefers-reduced-motion: reduce`.
- No layout shift introduced: images keep explicit dimensions/aspect ratios.
- Code comments single line, current behavior. Stage explicit paths. Commits end with the co-author trailer.

## Popover behavior checklist (run before and after every task that touches layout, modal, spotlight, or navigation)

At 1440×900 and 390×844, light theme:
1. Scroll home to the Projects section, click the spotlight card → project opens; page behind is the home page at the same scroll position, blurred.
2. Scroll inside the popover; the background does not move.
3. Click backdrop → returns to `/#projects`. Reopen; click close button → same. Reopen; press Escape → same.
4. Entry animation visible (not instant, not janky); with reduced motion emulated, no animation.
5. Mobile: same presentation (card, not full screen).
Record pass/fail per item in the task report.

---

### Task 0: Merge hero and About

**Files:** `v2/src/components/Hero.astro`, `v2/src/components/About.astro` (delete after merge), `v2/src/pages/index.astro`, `v2/src/pages/projects/[...slug].astro`, `v2/src/lib/site.ts` (nav anchors if `#about` is referenced), `v2/src/styles/globals.css` (anchor list).

- [ ] One intro section replaces Hero + About (Rodolfo: "the hero being just the name is weird for a personal website"). Layout: on desktop, profile photo (square, rounded, ~200-240 px) left of the name block; on mobile, photo above the name at ~120 px. Name stays the large heading; REMOVE the "Machine learning & robotics" subtitle and the "Bay Area" chip (Rodolfo); the About paragraphs follow directly under the name and carry the technical framing (ML, robotics, current role), keeping the existing opening line "I build at the intersection of deep learning, reinforcement learning, and robotics..." (Rodolfo likes it); the View work / LinkedIn buttons stay; the scrolling company/school logo strip (`Experience.astro`) stays directly below, unchanged.
- [ ] Keep `id="about"` on the merged section so existing anchors work; remove the standalone About section from both the home page and the project route (which renders the home page behind the popover).
- [ ] Section padding tightened so the intro plus the logo strip fit in one viewport at 1440×900 and the photo is visible above the fold on a 390×844 phone.
- [ ] Profile image keeps explicit width/height and alt text.
- [ ] Popover checklist (the project route renders this section behind the modal); screenshots at 1440/390 light/dark; commit "Merge hero and About into one intro".

### Task 1: Cross-document view transitions

**Files:** `v2/src/styles/globals.css`, `v2/src/components/ProjectSpotlight.tsx`, `v2/src/components/ProjectModal.astro`.

- [ ] Add to `globals.css`: `@view-transition { navigation: auto; }`; root crossfade 180 ms ease-out (`::view-transition-old(root)`, `::view-transition-new(root)`); disable under reduced motion (`@media (prefers-reduced-motion: reduce) { @view-transition { navigation: none; } }`).
- [ ] Shared element: the spotlight's active title (`<h3>` in the desktop card) and the mobile card title get `style={{ viewTransitionName: \`project-title-${p.id}\` }}` only for the element being navigated from (set it on pointerdown/focus of that link, clear on others, to keep names unique); `ProjectModal.astro`'s `<h1>` gets `style={\`view-transition-name: project-title-${project.id}\`}`. Transition group duration 260 ms, same easing as the modal.
- [ ] The popover's own `animate-modal-in` stays; verify the combination doesn't double-animate awkwardly — if it does, keep the modal animation and drop the title morph (ledger the ruling).
- [ ] Popover checklist before/after; Chrome and Safari behavior (Safari 18 supports cross-document transitions; older browsers just navigate normally).
- [ ] Commit "Add cross-document view transitions".

### Task 2: Spotlight smoothness

**Files:** `ProjectSpotlight.tsx`, `ProjectShowcase.astro`.

- [ ] Crossfade: `transition-[opacity,transform] duration-500` → `duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]`; inactive covers get `scale-[1.02]` so the incoming image settles to 1.0 as it fades in.
- [ ] Rail hover intent: switch the active project after 60 ms of hover (cancel on leave) so skimming the rail doesn't strobe; keyboard focus switches immediately.
- [ ] Preload: on first hover/focus of a rail item, create `new Image().src = cover` for its cover (covers are already stacked; this ensures decode before fade). Add `decoding="async"` to all covers.
- [ ] Text block: fade/slide the title+summary on change (key the text container by `current.id`, 250 ms fade-up; reduced motion: none).
- [ ] Mobile strip: `scroll-snap-type: x mandatory` already present; add `scroll-padding-inline: 1.5rem`, card width `min(300px, 82vw)`, and a pagination dot row (active dot follows scroll via IntersectionObserver); tap targets ≥ 44 px.
- [ ] Popover checklist; commit "Smooth spotlight transitions and mobile strip".

### Task 3: Reveal stagger, typography, and modal prose

**Files:** `globals.css`, `BaseLayout.astro` (reveal observer only), `ProjectModal.astro` (prose styles only).

- [ ] Reveal: children marked `data-reveal-item` inside a `[data-reveal]` section get `transition-delay: calc(var(--i) * 60ms)` with `--i` set by the observer when the section becomes visible; max 8 steps.
- [ ] Prose rhythm in `.prose-content`: `h2` margin-top 3rem / bottom 0.875rem with a thin top rule (`border-t` 1px `--color-border`, `padding-top: 1.5rem`) for section separation; `p + p` spacing 1rem; `figure figcaption` mono 12px muted, 0.5rem top margin; max line length 68ch for paragraphs inside the modal; `h3` 1.125rem.
- [ ] Headings in Hero/About keep sizes; tighten About paragraph line-height to 1.65.
- [ ] Popover checklist; commit "Stagger reveals and refine project prose".

### Task 4: Performance and accessibility

**Files:** `Model3D.astro`, `BaseLayout.astro` (head only), `ProjectModal.astro` (focus management additive), components using `<img>`.

- [ ] `Model3D.astro`: replace the eager `import "@google/model-viewer"` with an IntersectionObserver that dynamically imports it when a viewer is within 200 px of the viewport; poster stays until loaded.
- [ ] All content `<img>` get `decoding="async"` and explicit `width`/`height`; above-the-fold spotlight cover gets `fetchpriority="high"`. Images are served as-is from `public/` (already small); no Astro Image transforms.
- [ ] Fonts: preload the Latin subset of Geist Variable (`<link rel="preload" as="font" type="font/woff2" crossorigin>` for the file Vite emits; resolve its URL via `import geistUrl from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url"`).
- [ ] Popover focus management (additive): on load, move focus to the modal's close button; Tab/Shift+Tab cycle within the modal card (focus trap). Escape behavior unchanged (still `/#projects`). Lightbox dialogs from Phase 3 keep their own Esc handling.
- [ ] Measure: in the browser pane, record CLS via `PerformanceObserver` over a load + scroll of the home page and one project page (target < 0.02), and LCP time (report only).
- [ ] Popover checklist; commit "Lazy-load 3D viewer, preload font, add modal focus trap".

### Task 5: Visual verification pass

- [ ] Controller screenshots: home (hero, projects, personal, contact), each project page, `/hobbies`, `/chat`, at 1440 and 390, light and dark. Fix regressions found (via fix dispatch).
- [ ] `npm test`, `npm run build`, `npm run assets:check` pass.
