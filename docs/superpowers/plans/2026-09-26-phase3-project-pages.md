# Site Refresh — Phase 3: Project Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite every kept project page and add the wall lamp and RaiApps pages, using the Phase 2 assets and diagrams, concise humanized prose, and a small set of reusable MDX components.

**Architecture:** New presentational components live in `v2/src/components/project/` and are imported by MDX pages. Content facts come from the curated knowledge files in `v2/knowledge/` (already reviewed, third person), rewritten into first-person-free page prose in the site voice and passed through the `humanizer` skill. The project popover (`ProjectModal.astro`) keeps its behavior exactly; it only gains an optional spec strip under the tags.

**Tech Stack:** Astro 5 content collections (MDX), Tailwind 4 tokens, `@google/model-viewer` (existing `Model3D`/`Model3DPair`).

**Spec:** `docs/superpowers/specs/2026-09-25-site-refresh-design.md`

## Global Constraints

- No unreleased brand/product names or excluded terms anywhere (enforced by `npm test`). Lamp titles: "Rising-Core Desk Lamp", "Kinetic Wall Lamp". Wall lamp: no angle specs. Lamp electronics: high level only.
- `links.github` only for public repos: tobias, TidyNET, computation_brain, grinder, RoodsBurger.github.io.
- Voice: understated, direct, no exclamation marks, no marketing words ("cutting-edge", "seamless", "leverage", "showcase", "delve"), no em-dash chains. Every page's prose passes through the `humanizer` skill before commit. Pages speak about the project; first person ("I built") is allowed as on the current site.
- Page shape: hero media → 3–5 short `##` sections → gallery; diagrams only for RaiBudget (on RaiApps), TidyNET, and the LLM Chat page (Rodolfo's choice); 350–600 words per page (RaiApps up to 900).
- Facts must match `v2/knowledge/<file>.md` for that project. Framing corrections: TidyNET extends the Creative Machines Lab's knolling work (not a paper author); pruning is Fall 2020 and the finding is that pruning 80–95% of weights improved test performance; grinder speed is 30–150 RPM at the burr.
- Project popover behavior is frozen (see spec §4). Only additive markup inside the modal card is allowed.
- Images: use the Phase 2 assets under `/artifacts/<slug>/` as plain `<img>` with explicit `width`/`height`, `loading="lazy"`, `decoding="async"` (served as-is; no Astro Image transforms). Covers use `cover.webp` (16:10, 2560×1600). Alt text is descriptive and brand-free. Masks live outside `public/` and are never referenced by pages.
- Code comments: single line, current behavior only. Stage explicit paths. Do not push.

---

## File Structure

- Create `v2/src/components/project/{Figure,RenderGallery,SpecStrip,DeviceFrame,AppSection}.astro`.
- Modify `v2/src/content/config.ts` (add `coverTall?`, `specs?`), `v2/src/components/ProjectModal.astro` (render `SpecStrip` when `specs` present).
- Rewrite `v2/src/content/projects/{tobias,desk-lamp,grinder,knolling,pruning,chat-project}.mdx`.
- Create `v2/src/content/projects/{wall-lamp,raiapps}.mdx`.
- Modify `v2/tests/content.test.mjs` (slug set), both `netlify.toml` (`/projects/raidrive` → `/projects/raiapps` 301).
- Remove unused old artifacts after pages switch (`lamp_cover.webp`, `grinder_cover.webp` placeholder) only if nothing references them.

---

### Task 1: Project components and schema

**Files:** the five components, `config.ts`, `ProjectModal.astro`.

**Interfaces (produced):**
- `Figure`: props `{ src: string; alt: string; caption?: string; ratio?: "16/10" | "4/5" | "1/1" | "3/2"; video?: boolean }`. Renders `<figure class="not-prose my-8">` with a bordered, rounded frame of the given aspect ratio, `object-cover` plain `<img>` (`loading="lazy"`, `decoding="async"`, explicit width/height from ratio) or muted looping autoplay video (webm + mp4 sources, `playsinline`, `preload="metadata"`), optional mono muted caption.
- `RenderGallery`: props `{ items: { src: string; alt: string }[]; ratio?: "1/1" | "4/5" | "16/10"; columns?: 2 | 3 }`. Grid of same-ratio thumbnails; click opens a `<dialog>` lightbox showing the full image; Esc and a close button close it; arrow keys move between items; focus returns to the clicked thumbnail. The lightbox dialog is independent of the project popover: pressing Esc while the lightbox is open closes only the lightbox (stop propagation so `BaseLayout`'s Esc handler does not fire).
- `SpecStrip`: props `{ specs: { label: string; value: string }[] }`. Mono key/value row, wraps on mobile.
- `DeviceFrame`: props `{ src: string; alt: string; caption?: string }`. Rounded 2.25rem phone frame with a 10 px bezel in `--color-foreground` at 90%, natural screenshot ratio (1080×2400).
- `AppSection`: props `{ name: string; tagline: string; size: "large" | "compact"; icon?: string; github?: string }` with a default slot. Large: two-column on md+ (text left, slot media right), full width on mobile. Compact: bordered card with icon, name, tagline, slot text.
- Schema: `coverTall: z.string().optional()`, `specs: z.array(z.object({ label: z.string(), value: z.string() })).optional()`.
- `ProjectModal.astro`: after the tags row, `{project.data.specs && <SpecStrip specs={project.data.specs} />}`. No other change.

- [ ] Step 1: Implement components; build a temporary page `src/pages/components-preview.astro` exercising each with Phase 2 assets. Controller checks at 1440/390, light/dark, including lightbox keyboard behavior and that Esc in the lightbox does not close the popover. Delete the preview page before commit.
- [ ] Step 2: `npm test`, `npm run build` clean. Commit "Add project page components and spec strip".

### Task 2: Desk lamp page

**Files:** `v2/src/content/projects/desk-lamp.mdx`.

- [ ] Frontmatter: `cover: "/artifacts/desk-lamp/cover.webp"`, `coverTall: "/artifacts/desk-lamp/hero.webp"`, `coverAlt: "Rising-core desk lamp on a dark studio floor"`, tags `["ESP32-S3", "BLDC", "SimpleFOC", "Matter", "ESP-IDF"]`, `specs`: Motor `Brushless gimbal + lead screw`; Control `Knob with encoder`; Connectivity `Matter over WiFi`; Updates `Signed OTA`. No `links`.
- [ ] Body: `Figure` lift video (`/artifacts/desk-lamp/lift.webm`, ratio 4/5) beside/above prose; sections: How it works (brightness is position), Mechanism (motor, lead screw, carriage), Electronics and firmware (custom ESP32-S3 board at a high level, SimpleFOC on its own core, Matter, signed OTA), Earlier versions (stepper-driven predecessor, one sentence), then `Model3DPair` with the existing `lamp_closed.glb`/`lamp_open.glb`, then `RenderGallery` of `hero.webp` + `paper.webp` (ratio 4/5, 2 columns). Prose from `v2/knowledge/desk-lamp.md`; humanizer pass.
- [ ] `npm test && npm run build`; commit "Rewrite desk lamp page".

### Task 3: Grinder page

- [ ] Frontmatter: covers `/artifacts/grinder/cover.webp` + `hero.webp`, `coverAlt: "Motorized coffee grinder with auger doser"`, tags `["Raspberry Pi", "Python", "Stepper Motor", "Custom PCB", "Touchscreen"]`, `specs`: Burr speed `30–150 RPM`; Drive `NEMA 23 + 2:1 reduction`; Doser `Servo-driven auger`; Screen `1.28" round touch`. Keep `links.github`.
- [ ] Body: `Figure` hero (4/5); sections: What it is (hand grinder turned appliance), Grinding and dosing (ramp, delayed doser start, burst dosing), Software (three processes, shared SPI handoff, crash teardown), Hardware (NEMA 23, DRV8711 on a custom driver board, 2:1 gearbox, round GC9A01 + CST816T), then a single `Model3D` with `/artifacts/grinder/wide.glb` (funnel + doser configuration, neutral environment), then `RenderGallery` of `angle-1..3.webp` (1/1, 3 columns). Humanizer pass.
- [ ] `npm test && npm run build`; commit "Rewrite grinder page with renders, diagrams, and 3D models".

### Task 4: Wall lamp page (new)

- [ ] Create `wall-lamp.mdx`: title "Kinetic Wall Lamp", summary one sentence (knock the arm and it moves to the next held position; light reflects off plates on the wall), tags `["ESP32-S3", "BLDC", "SimpleFOC", "Matter", "3D Printing"]`, `category: ["code", "cad"]`, `order: 6`, covers `/artifacts/wall-lamp/cover.webp` + `hero.webp`, `specs`: Input `Knock the arm`; Holding `Friction of the reduction, driver asleep`; Board `Shared with the desk lamp`; Connectivity `Matter over WiFi`. No links, no angles.
- [ ] Body (concise, ~350 words): `Figure` hero (4/5); sections: Knock to move, The light (puck facing plates on the wall; the plate chooses the colour of the light), Drive, Electronics (reuse of the desk lamp board, forked firmware); `RenderGallery` of the three poses (1/1, 3 columns). Humanizer pass.
- [ ] Update `content.test.mjs` slug set to include `wall-lamp`; `npm test && npm run build`; commit "Add kinetic wall lamp page".

### Task 5: RaiApps page (new)

- [ ] Create `raiapps.mdx`: title "RaiApps", summary "Two apps I built for my own use: a shared budget with investment analysis, and a climbing training tracker.", tags `["Flutter", "Supabase", "Plaid", "Riverpod", "LLM analysis"]`, `category: ["code"]`, `order: 5`, cover: a 16:10 composite of the RaiBudget and RaiClimbing phone screenshots in `DeviceFrame` style produced by `v2/scripts/make-raiapps-cover.mjs` (sharp: dark neutral background `#18181b`, two phones side by side, ≥8% margins, subject in upper 65%) saved as `/artifacts/raiapps/cover.webp` and added to the manifest as a `cover` slot without mask; no `links.github` (both repos are private).
- [ ] Body: short intro (one paragraph: apps built for personal use, shared design language); `AppSection` RaiBudget (large): 2–3 short paragraphs + `DeviceFrame` phone screenshots (dashboard, budgets) + `RaiBudgetArchitecture`; a separate "Investments" sub-part with `budget-investments.webp`, `budget-investments-analysis.webp`, `budget-investments-charts.webp` (and `-recs` if present) in `DeviceFrame`s and one short paragraph on the portfolio view and the scheduled investments analysis; a reserved placeholder comment for a future video (`{/* video slot */}`, no visible element). `AppSection` RaiClimbing (large): 2–3 paragraphs + 3–4 phone screenshots (today, climbs, analysis, recs) in a row of `DeviceFrame`s. No RaiUsage or RaiDrive sections (dropped by Rodolfo). ≤ 900 words. Humanizer pass.
- [ ] Update slug set to include `raiapps`; change `/projects/raidrive` redirect to `to = "/projects/raiapps"`, `status = 301` in both `netlify.toml` (sections identical). `npm test && npm run build`; commit "Add RaiApps page".

### Task 6: Tobias, TidyNET, Pruning, LLM Chat pages

Batched: four rewrites of the same shape.
- [ ] Tobias: keep existing videos (`MediaGrid`) and render; add hardware section (Pi 4, 8 LX-16A, IMU, round eye display, phone UI + Flask); neutral attribution; keep links. Specs: Actuators `8 LX-16A bus servos`; Learning `SAC vs DQN (PyBullet)`; Transfer `Trajectory replay + live policy`.
- [ ] TidyNET: frame as extending the lab's knolling work; pipeline + `TidyNetPipeline`; numbers 74.2% placement, 70% end-to-end; keep existing media and lab/paper links. Specs: Robot `WidowX 200 (ROS2)`; Vision `YOLO-OBB`; Planner `Classifier-free-guidance diffusion`.
- [ ] Pruning: date Fall 2020; corrected finding; keep existing figures. Specs: Datasets `Fashion-MNIST, CIFAR-10`; Setup `2×2×2 sweep`.
- [ ] LLM Chat: describe the current pipeline (Cohere embed-v4 + rerank + Command A over a Pinecone index built from the site's own content, streamed replies); `ChatRag`; keep existing screenshots. Specs: Retrieval `Pinecone + rerank`; Model `Cohere Command A`; Index `Built from site content`.
- [ ] Humanizer pass on all four; `npm test && npm run build`; commit per page.

### Task 7: Cleanup and verification

- [ ] Remove unreferenced old assets (`grinder_cover.webp` placeholder, `lamp_cover.webp` if unused) — verify with grep first.
- [ ] Browser pass (controller): home spotlight order and covers, every project page at 1440/390 light/dark, popover behavior checklist from spec §4 unchanged, lightbox keyboard, 3D viewers load, no console errors, no 404s.
- [ ] Rebuild the chat knowledge index into a fresh namespace from `v2/knowledge/` (unchanged facts) only if knowledge files changed in this phase.
