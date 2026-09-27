# SDD ledger — plan: docs/superpowers/plans/2026-09-26-phase3-project-pages.md
Spec: docs/superpowers/specs/2026-09-25-site-refresh-design.md

## Pre-flight scan
| Pair / task | Shared file or interface | Finding |
|---|---|---|
| T1 → T2–T6 | Figure, RenderGallery, SpecStrip, DeviceFrame, AppSection, schema specs/coverTall | Consumers use the props defined in T1; DeviceFrame is phone-only (no kind prop) |
| T1 self | ProjectModal change | Only additive SpecStrip after tags; popover behavior frozen |
| T3 self | Model3D environment | Grinder needs neutral environment: T3 adds optional `environment` prop to Model3D (default unchanged) |
| T3 self | grinder GLB | Single Model3D with wide.glb (doser.glb deleted in Phase 2) |
| T2–T5 | content.test.mjs slug set | T4 adds wall-lamp, T5 adds raiapps; sequential |
| T5 self | raiapps cover composite | cover slot min width is now 2560: composite must be 2560x1600 |
| T5 self | screenshots | budget-* (10) and climbing-* (6) exist; RaiUsage/RaiDrive dropped |
| T6 self | diagrams | Only TidyNetPipeline and ChatRag exist (Tobias/Pruning have no diagram) |
| All | masks | Masks live in v2/asset-masks; pages must never reference masks |
| All | prose | humanizer pass; facts from v2/knowledge/*.md |

## Rulings
Ruling: T3 adds `environment?: string` prop to Model3D (default = current HDR) and the grinder passes "neutral" — per Phase 2 ruling on olive tint — cost if wrong: none.

## Progress
Task 1: implementer done ce6ce32..b98e8a8, in review
Task 1: review Approved; Important: lightbox dialog unlabeled; Minor: thumb dims hardcoded
Task 1: fix round 1/5 (a533381) — controller verified the 1-file diff directly
Ruling: tiny single-file fix rounds may be verified by the controller reading the diff instead of a re-review subagent — scope is mechanical and fully visible — cost if wrong: small a11y regression caught in final review.
Task 1: minor (deferred): galleryId via Math.random
Task 1: complete (commits ce6ce32..a533381)
Tasks 2-4: implementer done a533381..64ba8d3 (desk-lamp, grinder, wall-lamp pages)
Controller: profile photo replaced per Rodolfo (square crop with Tobias, EXIF/GPS stripped) — commit above.
Ruling: wall-lamp page mentions the current head concept (light at the arm's end facing colored plates on the wall, reflecting their color), since the renders show it and Rodolfo chose it; update v2/knowledge/wall-lamp.md to match — cost if wrong: concept described as current when still a study; worded as "current concept".
Rodolfo (2026-09-26): after all phases, a site-wide prose review (humanizer, aligned with the Anthropic job post, using the Personal Dossier agent's material) → Phase 6.
Tasks 2-4: wall-lamp light concept added (68be9b2)
Controller: moved 23 private PDFs out of v2/public/documents to gitignored root documents/from-v2-public; cleared v2/dist/documents (Dossier session flagged manual-deploy exposure). Guard test for PDFs under public/ to add in Task 7.
Rodolfo: keep Cohere for chat generation (no Claude switch).
Dossier session input received (job post, positioning, do-not-publish list) → Phase 6 prose review.
Tasks 2-4: review Approved (0 critical/important); minor (deferred): wall-lamp spec wording differs from brief (equivalent); screenshot evidence was viewport-only (reviewer verified live)
Tasks 2-4: complete (commits a533381..68be9b2)
Ruling: Task 5 also removes RaiUsage/RaiDrive from v2/knowledge/raiapps.md + projects-overview.md now (keeps page and chat consistent) and uses Dossier-provided public-safe facts for the agent pattern (validator, verbatim-changes rule, server-computed figures, no buy/sell advice) — cost if wrong: small knowledge edit early.
Rodolfo (2026-09-26): keep the robotics identity — Phase 6 prose adds Anthropic-aligned positioning alongside, never replacing, 'Machine learning & robotics' and the robotics/hardware projects.
Task 5: implementer done 68be9b2..30facb7 (incl. controller-requested fixes: stacked layout + cover, partner name removed + sample-data note); in review
Task 5: review — Important: 'net worth'/'holdings, allocation, performance'/'allocation drift, concentration' not in raiapps.md; -recs screenshot unused. Minor: stale screenshots; AppSection now unused.
Ruling: keep those phrases — they describe features visible in the committed screenshots of the real app; add them to raiapps.md in Phase 6 knowledge sync — cost if wrong: minor overstatement.
Ruling: -recs intentionally unused (rows of exactly 3) — cost if wrong: none.
Rodolfo: remove the sample-data note (done by controller, trivial one-line delete); prose feels odd ("RaiApps is my name for...") → Phase 6 rewrite using Rodolfo's voice guide; casual tone OK.
Task 5: minor (deferred): delete unused AppSection.astro in Task 7 cleanup.
Task 5: complete (commits 68be9b2..HEAD)
Task 6: implementer done (4 page commits); voice guide received from Dossier session → .superpowers/voice-guide.md (gitignored) for Phase 6.
Ruling: Phase 6 follows Rodolfo's voice guide over generic humanizer where they conflict (em dashes allowed, used correctly and sparingly) — his own style is the target — cost if wrong: a few more dashes than humanizer likes.
Rodolfo: NO em dashes — humanizer wins; previous em-dash ruling reversed (voice guide applies otherwise).
Task 6: review Pass; Important: chat-project MediaGrid shows desktop shot on mobile (swap order). Minor: tobias touchscreen "status display" vs "control interface"; ChatRag diagram numbers (top 20 / top 4) not in knowledge; orphan chat_diagram.webp; MediaGrid imgs lack width/height.
Ruling: fold Task 6 Important + minors (swap order, touchscreen wording to knowledge, add top-20/top-4 retrieval facts to chat-assistant.md since Phase 5 implements exactly that, delete orphan) into Task 7 — cost if wrong: none.
Task 6: complete (commits 2e9d629..8a5cdb5)
Task 7: complete (8a5cdb5..71801f8; controller verified modal change is padding-only; spot-checked screenshots)
Final review: Important — (1) lightbox Esc keyup closes popover; (2) partner/household wording on RaiApps + knowledge; (3) 'Alex' in unused deployed screenshot; (4) chat page describes post-Phase-5 pipeline (gate: no deploy before Phase 5). Minors triaged.
Rodolfo (2026-09-26): remove spec strips from all projects (tags suffice); move links (GitHub etc.) to the bottom of every project page; grinder hero more frontal and less tall; new climbing photo (done by controller: 4:3 crop excluding bystander).
Ruling: 'Alex' is the fake sample name (Rodolfo set it) — no history rewrite needed; still remove the unused screenshots from public/ — cost if wrong: none.
Ruling: grinder page hero becomes a 3:2 frontal render (wide slot 2400x1600) instead of 4:5 — "less tall" — cost if wrong: re-render.
Rodolfo (2026-09-26): merge hero with About (photo + name + about text), keep the company/school scroller → Phase 4 Task 0.
Rodolfo: remove the 'Machine learning & robotics' subtitle and the 'Bay Area' chip; the About text carries the technical framing (robotics identity stays, in the About prose).
Rodolfo: keep the current About opening line ('I build at the intersection of deep learning, reinforcement learning, and robotics...') — Phase 6 must preserve it (light touch only if needed).
Grinder hero: frontal 3:2 committed 81d1179 (controller verified). 
Ruling correction: parallel implementers in one checkout collided (shared git index swept another agent's staged deletions into 81d1179; manifest briefly overwritten then restored). No more parallel committing agents in this checkout — use worktrees if parallelism is needed. Cost: messier commit boundaries; content intact (being verified by the fix agent).
Final fix wave: complete (tests 45/45, assets 29/29, popover checklist 18/18 incl. lightbox Esc, 0 em dashes). Commit boundaries mixed because the controller's `git commit -a` plan commits swept the agent's unstaged edits — controller fault; content verified; branch will be squashed before push. Controller now stages explicit paths only.
Phase 3: COMPLETE.
