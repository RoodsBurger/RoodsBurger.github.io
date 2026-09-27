# rraimundo.me site refresh — design

Date: 2026-09-25 · Branch: `site-refresh` · Site: `v2/` (Astro 5, Tailwind 4, Netlify)

## Goals

1. Frontend feels smoother and more modern while keeping the current format, layout, and monochrome palette.
2. Every kept project is rewritten with current facts, correctly framed renders/media, and diagrams where they help.
3. New projects: rising-core desk lamp (replaces "Brushless Lamp"), kinetic wall lamp, RaiApps.
4. Chat assistant (Cohere + Pinecone) reviewed and improved; knowledge base kept in sync with site content.

## Constraints and decisions

- Framing (Rodolfo): this is a personal website that also serves as a portfolio. It should read and feel like a person's site first (who he is, what he builds, what he does outside work), with the projects as the portfolio inside it, not a product landing page or a recruiter pitch.
- **No brand names.** The lamp brand's name and either lamp's product name never appear on the site, in alt text, filenames, or the chat index. Lamps use descriptive titles: "Rising-Core Desk Lamp" and "Kinetic Wall Lamp".
- **Lamp disclosure level:** renders, minimal mechanism diagrams, high-level electronics/firmware. No PCB layouts, board photos, BOMs, vendor/order files, or section drawings.
- **Wall lamp:** no angle specs; motion described qualitatively. Renders use the `reflexo` head concept (wall plates lit by the puck).
- **GitHub links only for public repos:** tobias, TidyNET, computation_brain, grinder, RaiUsage, RoodsBurger.github.io. Remove for lamps, RaiBudget, RaiClimbing, RaiDrive.
- **Removed projects:** Wallet, Plex File Manager, standalone RaiDrive (folded into RaiApps).
- **Bio:** add Pindrop role "Research Scientist, Authentication & ID Research, since Jun 2025" to the landing page. Do not add the paper, awards, or the startup.
- **Private data:** no real RaiBudget/RaiClimbing data enters the repo or screenshots. Files like `raibudget-data.json`, `raiclimbing-data.json`, `.backups/`, `.secrets/`, and real report fixtures are never read into outputs.
- **Prose:** sourced from `~/Documents/Resume/dossier/` and project folders; every block passes through the `humanizer` skill. Voice: understated, direct, no exclamation marks, no marketing tone.
- **Hosting:** Netlify (root `netlify.toml` builds `base = "v2"`).

## Order of work

1. **Content foundation (quick wins):** remove Wallet/Plex/RaiDrive pages, strip private GitHub links, drop the broken grinder 3D viewers (GLBs missing), add Pindrop role, add redirects.
2. **Asset production:** renders, diagrams, fake-data app screenshots.
3. **Project pages:** rewrite with new components and assets.
4. **Frontend polish.**
5. **Chat:** improvements + re-index from site content.

Each step ships as its own commit set and is verified in the browser before moving on.

## 1. Content model and components

### Schema (`v2/src/content/config.ts`)

- `cover` stays (16:10, used by spotlight/cards). Add optional `coverTall` (4:5) for mobile strip and portrait contexts.
- Add optional `specs: { label: string; value: string }[]` rendered as a strip under the modal title.
- `links.github` remains optional; populated only for public repos.
- `model3d` retained for projects with real GLBs.

### New MDX components (`v2/src/components/project/`)

| Component | Purpose |
|---|---|
| `Figure` | Single image, fixed aspect ratio prop, caption, Astro `<Image>` optimization, theme-safe border/background |
| `RenderGallery` | 2–4 same-ratio images in a grid with click-to-enlarge lightbox (keyboard + Esc) |
| `Diagram` | Frame + caption for inline SVG diagram components; SVGs use `currentColor` and CSS tokens so they follow light/dark |
| `SpecStrip` | Monospace key/value row |
| `DeviceFrame` | Minimal phone or macOS window frame around app screenshots |
| `AppSection` | RaiApps block, `size="large" \| "compact"` |

Diagrams live as `.astro` SVG components in `v2/src/components/diagrams/`.

### Lineup and order

1. Tobias · 2. Rising-Core Desk Lamp · 3. Grinder · 4. TidyNET · 5. RaiApps · 6. Kinetic Wall Lamp · 7. Pruning · 8. LLM Chat Assistant

Slugs: `tobias`, `desk-lamp`, `grinder`, `knolling`, `raiapps`, `wall-lamp`, `pruning`, `chat-project`.

### Redirects (both `netlify.toml` files)

- `/projects/lamp` → `/projects/desk-lamp` (301)
- `/projects/raidrive` → `/projects/raiapps` (301)
- `/projects/wallet`, `/projects/wallet.html`, `/projects/plex` → `/#projects` (301)

## 2. Asset pipeline and framing

### Framing rules (all projects)

- Render at the target ratio; never crop after the fact. Slot ratios: **16:10** cover/spotlight, **4:5** tall hero, **1:1** gallery tile, **3:2** wide figure.
- Subject fills 70–80% of frame height with ≥8% margin on every side; nothing clipped.
- Covers: subject sits in the upper 65% because the spotlight's gradient caption overlays the bottom ~35%.
- Consistent 85 mm lens and neutral warm-grey seamless background across product renders so covers read as one set.
- Lighting: studio preset (key/rim/fill) for grinder and desk lamp; wall-lamp scene uses the `reflexo` wall plane with puck light spill on the plates.
- Verification: `v2/scripts/check-assets.mjs` checks each output's dimensions/ratio and, for renders with alpha, subject bounding-box margins. Then visual check of every slot at 1440 px and 390 px widths, both themes.

### Sources per project

| Project | Source |
|---|---|
| Grinder | CAD from Fusion cloud → Fusion MCP export (USDZ/STL) → Blender pipeline adapted from `~/Documents/Personal Projects/$BRAND/brand/3d/blender/` → cover, tall hero, 3 gallery angles; also regenerate a Draco GLB for the 3D viewer |
| Desk lamp | Existing renders in `$BRAND/brand/3d/renders/` (2000×2500) for tall/gallery; new 16:10 cover render from the same scene; `renders/anim/desk-lamp-lift.webm` re-encoded and renamed; existing site GLBs retained |
| Wall lamp | `reflexo` concept from `$BRAND/brand/wall-lamp-head/wall_lamp_heads.py`, re-rendered at 16:10 cover, 4:5 hero, and three pose shots (left/center/right) |
| Tobias, TidyNET, Pruning, Chat | Existing media re-framed/re-encoded; new diagrams |
| RaiApps | Fake-data screenshots (see below) in `DeviceFrame` |

All renamed to neutral filenames (no brand names). Output formats: webp/avif via Astro `<Image>`; video as webm + mp4 fallback. Source renders and intermediate frames stay outside the repo.

### App screenshots (fake data)

- **RaiClimbing (Android):** write a fake versioned export JSON, import via Settings → "Import training data (JSON)" on an Android emulator, capture key screens (today/session logging, charts, analysis report). Fake report data only.
- **RaiBudget (Flutter):** screenshot harness in a scratch copy/worktree that overrides Riverpod providers with fake transactions, budgets, goals, and investments (pattern from `app/test/*_screen_test.dart`), rendered as golden images or via `flutter run -d macos`. Never touches Supabase or Plaid.
- **RaiUsage (SwiftUI):** capture from previews/fixtures (`RaiUsageTests/Fixtures/`).
- **RaiDrive:** app icon plus one menu-bar popover capture or a compact card without a screenshot.

## 3. Project content

Each page: hero → spec strip → 3–5 short sections → diagrams/gallery. Target 350–600 words.

- **Tobias:** robot hardware (Pi 4, 8 LX-16A bus servos, LSM6DSOX + LIS3MDL IMU, round GC9A01 eye display), phone UI (React/MUI) + Flask backend, SAC vs DQN in PyBullet, sim-to-real via JSON trajectory replay. Diagram: sim-to-real loop. Neutral wording on team attribution.
- **Rising-Core Desk Lamp:** BLDC gimbal motor + lead screw raising a lit core on linear bearings; brightness is position; encoder knob; Matter over WiFi; signed OTA; custom ESP32-S3 board (high level). Diagrams: lift mechanism, electronics block. Lift animation + renders. No GitHub link.
- **Grinder:** hand grinder turned appliance; NEMA 23 + 2:1 gearbox driving the burr; 30–150 RPM at the burr; auger doser on a continuous servo with delayed start and burst dosing; round touchscreen with two swipe screens; custom driver PCB (DRV8711); three-process architecture with shared SPI bus handoff; crash-safe teardown. Diagrams: process layout, touch state machine. Renders + restored 3D viewer.
- **TidyNET:** Rodolfo's system extending the Creative Machines Lab's knolling work (not framed as a paper author). Diffusion (CFG DDPM) → YOLO-OBB → grasp/place on WidowX 200 / ROS2. Numbers: 74.2% placement, 70% end-to-end. Diagram: pipeline.
- **Pruning:** Fall 2020, COMS E6998. 2×2×2 sweep on Fashion-MNIST and CIFAR-10; finding that pruning 80–95% of weights helped test performance. Diagram: experiment grid.
- **Kinetic Wall Lamp:** arm moves between held positions when knocked; reuses the desk lamp's board and firmware base; drive evolved from printed planetary to printed cycloidal reduction. Diagram: drive train. `reflexo` renders. No angle specs.
- **RaiApps:** "Apps I built for my own use." RaiBudget (large): shared two-person budgeting, Plaid sync, Supabase realtime + RLS, investments view, scheduled LLM analysis routine, PIN/biometric lock; Flutter on iOS/Android/macOS; architecture diagram; placeholder slot for a future video. RaiClimbing (large): training tracker, per-set loads, pain check-ins that auto-reduce loads, Tension Board import, lock-screen rest timer, LLM analysis with one-tap recommendations; Flutter/Android; sync diagram. RaiUsage (compact): macOS menu-bar Claude usage tracker, fork of TokenEater with credited contributions; GitHub link. RaiDrive (compact): macOS menu-bar Google Drive sync, local-wins, Changes API, resumable uploads, power-aware.
- **LLM Chat Assistant:** rewritten to match the pipeline after section 5; diagram: RAG flow.
- **Landing:** Pindrop role added to Experience; Hero/About lightly edited for accuracy only.

## 4. Frontend polish

**Project popover behavior is frozen.** Rodolfo tuned it by hand; the implementation may change only if the observable behavior stays identical:
- Project routes render the real home page behind the modal, and the backdrop blurs that page.
- The page behind appears at the scroll position the project was opened from (saved on click in `sessionStorage` key `rr-bg-scroll`, body pinned with `position: fixed`).
- Body scroll locks while open; the modal scrolls internally with `overscroll-contain`.
- Backdrop click and the close button close it; Escape always returns to `/#projects`.
- Entry animation: 220 ms, `cubic-bezier(0.16, 1, 0.3, 1)`, 10 px rise + 0.99 scale; none under reduced motion.
- Same presentation on mobile and desktop (no switch to full-screen).
Any Phase 4 change touching `ProjectModal.astro`, `BaseLayout.astro`'s click/keyboard handlers, or project routing gets a before/after behavior check against this list at 1440 px and 390 px.

- **Motion:** Astro View Transitions (`<ClientRouter />`) with shared-element morph from project cover to modal hero; smoother spotlight crossfade easing and hover preload; staggered scroll reveals; all gated by `prefers-reduced-motion`.
- **Type and layout:** tighter vertical rhythm; improved modal prose (heading scale, figure captions, spacing).
- **Mobile:** snap-scrolling project strip, larger tap targets.
- **Performance:** Astro `<Image>` everywhere, lazy `model-viewer` on interaction, font subsetting; target Lighthouse ≥ 95 and CLS ≈ 0.
- **Accessibility:** modal focus trap, Esc closes, lightbox keyboard support.
- **Cleanup:** legacy v1 files at repo root are not deployed; removal decided in the implementation plan.
- **Verification:** screenshots at 1440 px and 390 px, light + dark, for home, each project, `/hobbies`, `/chat`.

## 5. Chat assistant

### Audit findings (2026-09-25)

- Cohere and Pinecone keys are hardcoded in `knowledge_base_setup.py` in public git history (added `4ca2e41`, deleted `ddd0432`). **Keys must be rotated by Rodolfo** in the Cohere and Pinecone dashboards, then updated in Netlify env vars.
- Live index `rodolfo-portfolio`: 156 records from 5 v1 HTML pages plus PDFs (resume, CV, reports, coursework, history papers). Grinder, lamp, RaiDrive, and all new projects are missing. The old indexer embedded documents with `input_type='search_query'` (should be `search_document`).
- `chat.ts`: no server-side origin check or rate limit (non-browser POSTs get full billed answers); healthcheck is public and makes a paid embed call; history accepts `role: "system"` with no per-message cap; `HISTORY_TURN_LIMIT` counts messages not turns; `PROFILE_SOURCES` / `ACADEMIC_KEYWORDS` filters target v1 filenames; no score threshold; context injected as a trailing system message instead of Cohere `documents`; no streaming; raw error details returned to clients; no upstream timeouts.
- Widget renders model markdown via `marked` + `dangerouslySetInnerHTML` without sanitizing.

### Changes

1. **In-repo indexer** `v2/scripts/build-index.mjs` (`npm run index`, `--dry-run`):
   - Sources: `src/content/projects/*.mdx` (frontmatter + body, MDX components stripped) and a new curated third-person `src/content/bio.md` (about, current role, experience, education, hobbies).
   - Chunk by heading (~800 chars, small overlap); metadata `{slug, title, url, section, text}`; deterministic IDs `slug#n`.
   - Embed with `embed-v4.0`, `output_dimension: 1024`, `input_type: search_document`.
   - Upsert into a new namespace (`v2-YYYYMMDD`); function reads namespace from `PINECONE_NAMESPACE` env, so cut-over is an env change. Old PDFs are not re-indexed.
2. **Hardening** in `chat.ts`:
   - Reject requests whose `Origin` is not in the allowlist.
   - Per-IP rate limit (e.g. 20 requests / 10 min) and a global daily cap, stored in Netlify Blobs.
   - History schema: roles `user | assistant` only, each ≤ 2000 chars, last 6 turns (12 messages).
   - Healthcheck requires `?healthcheck=<HEALTHCHECK_TOKEN>` and skips the paid embed.
   - Generic client-facing errors; details only in function logs.
   - `AbortSignal.timeout` on Cohere and Pinecone calls; clients created at module scope.
3. **Retrieval:** Pinecone topK 20 → `rerank-v4.0-fast` → top 4 above a relevance threshold (tuned against a fixed question set); boost chunks matching the current page's slug; pass chunks via Cohere v2 `documents`. Remove `filterContext`, `PROFILE_SOURCES`, `ACADEMIC_KEYWORDS`.
4. **Streaming:** Netlify Functions v2 handler returning a `ReadableStream` from `chatStream`; `chat-client.ts` and `ChatWidget` render tokens incrementally; non-streaming fallback on error.
5. **Model:** `COHERE_CHAT_MODEL` default `command-a-03-2025` after hardening ships (benchmarked 2026-09-25 on the trial key: same token use as command-r7b, ~1.4 s avg, concise, and the only light model that refused a prompt-injection test); env override allows rollback to `command-r7b-12-2024`. Prompt tightened: third person, lead with the answer, 1–3 sentences unless asked for more, project list answered from project chunks.
6. **Small fixes:** sanitize rendered markdown with DOMPurify; `sanity-chat.mjs` reads model env vars; `.env.example` updated with new vars (`PINECONE_NAMESPACE`, `HEALTHCHECK_TOKEN`).
7. **Evaluation:** `v2/scripts/eval-chat.mjs` runs a fixed set of ~15 questions (each project, current role, hobbies, greetings, off-topic, prompt-injection attempt) against local `netlify dev` and prints answers + retrieved slugs for manual review before cut-over.

### Git history

Rewriting history does not revoke leaked keys; rotation is required regardless. A scrubbed mirror is prepared locally with `git filter-repo`; force-pushing it to the public repo happens only with Rodolfo's explicit go-ahead.

## Out of scope

- RaiBudget promo video (slot reserved; produced later).
- The paper, awards, the startup, Plex, Wallet, RaiLauncher, scale, eagle-pcb-studio.
- Changes to hobbies page content beyond polish.
