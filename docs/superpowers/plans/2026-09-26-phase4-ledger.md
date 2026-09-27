# SDD ledger — plan: docs/superpowers/plans/2026-09-26-phase4-frontend-polish.md
Spec: docs/superpowers/specs/2026-09-25-site-refresh-design.md

## Pre-flight scan
| Pair / task | Shared | Finding |
|---|---|---|
| T0 → T1–T4 | Hero/About merge changes home layout | Later tasks build on the merged intro |
| T1 self | view transitions | CSS cross-document only; no ClientRouter (would break frozen popover + inline scripts) |
| T3 self | reveal stagger | merged intro must not be hidden on load (above the fold) |
| T4 self | focus trap | additive; Esc behavior unchanged incl. lightbox guard (escInDialog) |
| All | popover checklist | run before/after each task; existing CDP script popover.mjs in scratchpad phase3-final can be reused |

## Rulings
Ruling: serial dispatch only; controller stages explicit paths only (Phase 3 collision lesson).

## Progress
Task 0: complete (298ef5c; controller reviewed 1440 light + 390 dark viewport screenshots; checklist 9/9 both widths)
Ruling: batch Tasks 1–3 (view transitions, spotlight, reveal/typography) in one dispatch — they share globals.css/ProjectSpotlight/ProjectModal — cost if wrong: larger review diff.
Tasks 1-3: implementer done 298ef5c..559159f (view transitions CSS-only, spotlight, reveals/typography); checklist 9/9 before/after.
Rodolfo: intro text too big; remove "View work"; LinkedIn + GitHub as minimal icons on the right side.
Rodolfo: favicon is the lamp brand's mark (live since May on main; mark only, no name) → replace with a simplified Tobias SVG favicon.
Intro tweaks + Tobias favicon: 8dcc025, 774fdee (controller reviewed intro 1440/390 + favicon grid)
Tasks 1-3 + intro: review — Important: (1) background spotlight can duplicate the modal's view-transition-name via keyboard focus (fix: inert background on project routes, in Task 4); (2) prose figcaption rule leaks into .not-prose DeviceFrame. Minor: stripActive init 0; leading 1.6 vs 1.65; favicon red accent.
Ruling: favicon red feet accepted (Tobias's red feet; Rodolfo asked for Tobias) — cost if wrong: none. leading 1.6 accepted with smaller intro.
Rodolfo: remove the Contact ("Let's build something") section — footer already has email/LinkedIn/GitHub.
Ruling: fold review fixes, Contact removal, and Phase 3 deferred a11y/perf minors into Task 4 — cost if wrong: larger task.
Tasks 1-3: complete (298ef5c..774fdee) pending Task 4 fixes.
Task 4: implementer done (9a0667d, d278077, 9f72176, 66c8677): lazy model-viewer, focus trap + inert background, VT dup fix, figcaption scope, stripActive, mobile 3-col gallery, reduced-motion video, media-dims helper, Contact removed; checklists 18/18 + 12/12; CLS 0.
Dev server started for Rodolfo to preview (kept running at his request).
Dossier session: second public bylined Pindrop article (BYOV voice migration, 2026-08-25) with public numbers → Phase 6 prose/knowledge.
Dossier: BYOV wording — do not equate with the résumé's offline SVAR scoring tool; safe framing: offline enrollment work that went from POCs to 3M+ enrollments in production.
Rodolfo review (dev server): desk lamp — drop "Earlier versions", drop the two bottom renders, smaller video, interactive 3D of the NEWER version from Fusion; chat project — new picture + new name; RaiApps cover looks weird; grinder + desk-lamp preview pictures should be better centered.
Ruling: chat project renamed "RAG Chat Assistant"; cover = composited real chat screenshot — cost if wrong: rename again.
Ruling: covers re-rendered with subject centered horizontally and vertically near 40% (fill ~55%) so rail thumbnails (square center crops) frame well; rail thumbnails get object-position 50% 40% — cost if wrong: re-tune.
Ruling: serial — render/GLB agent first, then page agent; Task 4 review (read-only) runs in parallel.
Rodolfo: order — Tobias 1, RaiApps 2, desk-lamp 3, grinder 4, knolling 5, wall-lamp 6, pruning 7, chat-project 8 (page agent).
Ruling: run the prose review (Phase 6) BEFORE the chat work (Phase 5) — Phase 5 rebuilds the chat index from knowledge files, so final prose first avoids a second re-index; Rodolfo keeps flagging the stiff copy — cost if wrong: none.
Rodolfo: duplicated link rows (e.g. TidyNET inline 'Read the related paper · Lab GitHub' + bottom GitHub/Read report). Ruling: all links only in the bottom block; add links.more [{label,url}] to schema; remove inline link lines from MDX bodies (page agent, this round); prose review checks no page repeats links.
Task 4: review Approved; Important: 3-line comment in [...slug].astro; desk-lamp video has no poster for reduced-motion fallback. Minor: spotlight imgs lack width/height (harmless); focus trap coupled to dialog[open]; 2 pre-existing astro hints (MediaGrid captions typo, RenderGallery is:inline).
Ruling: fold both Important items + the 2 astro hints into the page-agent round — cost if wrong: none.
Task 4: complete (774fdee..66c8677)
Rodolfo: RaiClimbing bottom row — replace climbing-trends with climbing-charts (Progress heatmap + pyramid); controller restored climbing-charts.webp from history (page agent swaps + manifest).
Rodolfo: RaiClimbing screenshot order — row 1: today, climbs, plan; row 2: report, progress (climbing-charts), recs (page agent).
Rodolfo: recs screenshot should show some recommendations as applied → recapture on emulator (controller launched site_shots outside sandbox); climbing agent must NOT commit (controller commits) to avoid index collisions with the render agent.
Recs recapture: done (appliedRecKeys seeded via real import; 2 applied, 1 pending; controller verified preview); emulator stopped, AVD deleted; file uncommitted (page agent/controller commits).
Rodolfo: hero photo a bit bigger (page agent: desktop ~184 → ~224px, mobile ~96 → ~120px; keep text sizes).
Render round: 9c1bf01 (desk-lamp GLBs from open doc ss2_assembly v75, lift joint open/closed, 0 dup, 0 banned strings) + fcef037 (recentered covers). Controller: model differs from the older renders; accepted as the newer version Rodolfo had open (flagged to him).
Round 2 page agent: complete (7ff48f9..ecfb7da).
Rodolfo corrections: desk-lamp 3D is the WRONG model — use metal_assembly in the desk-lamp Fusion project (brushless folder); two viewers (closed, open), darker finish; add section-cut renders at the bottom (from the brand folder's desk-lamp material) — overrides earlier "no section drawings" ruling at Rodolfo's request.
Rodolfo: covers for desk lamp, grinder, wall lamp — move subject down (floor too visible, model top too close to the top edge). RaiApps cover — too much empty space (bottom and around, big spotlight too). RAG chat cover — use the ChatRag diagram instead.
Ruling: new cover rule for product renders: subject vertical center ~52%, fill ~68%, margins ≥8% top — spotlight gradient still readable — cost if wrong: re-tune once more.
Rodolfo: max 4 tags per project; RaiApps tags = Flutter, Supabase, Plaid, LLM (no 'LLM analysis', no Riverpod). Add a content test (tags.length <= 4). Page agent round 3.
Ruling: tag trims — chat: RAG, Cohere, Pinecone, Netlify; grinder: Raspberry Pi, Python, Stepper Motor, Custom PCB; desk-lamp: ESP32-S3, BLDC, SimpleFOC, Matter; wall-lamp: ESP32-S3, BLDC, Matter, 3D Printing; raiapps: Flutter, Supabase, Plaid, LLM.
Render round 3: 1bd8743 (assembly_metal v34 GLBs, darker, 0 banned), 79cde25 (section-cut SVGs scrubbed), 40ab3e2 (covers lowered, ~68% fill); controller reviewed cover previews.
Round 3 page agent: complete (cd2635e..d5777da; controller reviewed RaiApps + chat covers and desk-lamp page bottom).
Final review: ready for prose phase; Important: brand-mark logo.png still ships; section SVGs carry a parts list in <title>s; focus trap blocks model-viewer/video controls and chat; stale coverAlts; banned test doesn't read svg/json/glb contents; commit-message hit in 1bd8743 (squash handles).
Rodolfo: lid arc pattern is not the brand mark (keep); section cuts = cleaned drawings + 4-5 readable coarse labels + click-to-enlarge.
Ruling: one fix batch now (all Important + small Minors); commit-message hit resolved by the pre-push squash with a clean message — cost if wrong: none.
Round 4 page agent: complete (1191a10..bdf49a0): section cuts removed (Rodolfo), logo.png deleted, sentinel focus trap, thinner bezels, neutral env for desk-lamp viewers, alt fixes, banned test covers svg/json/md/txt/glb, tags.max(4), h2 labels, dead code removed.
Controller: committed light sandblasted-aluminium desk-lamp GLBs.
Phase 4: COMPLETE.
