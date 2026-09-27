# SDD ledger — plan: docs/superpowers/plans/2026-09-26-phase2-assets.md
Spec: docs/superpowers/specs/2026-09-25-site-refresh-design.md

## Pre-flight scan
| Pair / task | Shared file or interface | Finding |
|---|---|---|
| T0 → all | findBanned() contract | T0 changes matcher to hashed n-grams; content.test.mjs + build-index keep calling findBanned(text)->string|null. Broader n-gram match may surface new hits; T0 reports them |
| T0 self | tests positives | Positives read from gitignored .banned-terms.local; skipped when absent (CI has none) — acceptable, local runs cover it |
| T1 → T3/T4/T5/T7/T8/T9 | assets.manifest.json + check-assets | Later tasks append entries; slot-less entries (screenshots) only check existence/size — consistent with T1 CLI (skips ratio when no slot) |
| T1 self | MAX_BYTES webp 600 KB | 1600x2000 webp q86 of renders may exceed 600 KB; ruling below |
| T2 → T4 | grinder export | T4 depends on T2 output + controller confirmation of the model |
| T3/T4/T5 | render scripts outside repo | Not reviewable via repo diff; review via output images + script file read |
| T5 self | masks from cutout render | cutout is 2000x2500 alpha; resized to 1600x2000 — same ratio, consistent |
| T6 self | preview page | Temporary, deleted before commit — consistent |
| T7/T8 | scratch worktrees of private repos | Must not touch user checkouts or real data files |
| T10 | check:history expected fail | Gate resolved at merge by branch rewrite — consistent with T0 Step 4 |

## Rulings
Ruling: raise webp MAX_BYTES to 900 KB for tall/cover renders if q86 exceeds 600 KB, else drop quality to q80 first — keeps renders crisp while bounding size — cost if wrong: slightly heavier pages.
Ruling: T2 blocked-on-Fusion handling — if Fusion stays busy, run T3, T5, T6, T7, T8, T9 first and return to T2/T4 — tasks are independent — cost if wrong: none.
Ruling: render scripts live in $BRAND/brand/site-renders (outside public repo) — spec forbids brand names in public repo — cost if wrong: renders less reproducible from the site repo alone.

## Progress
Task 0: implementer done 1c0cb2a..b8833ab, in review
Task 0: review — 4 Important (3 plan-mandated): check-history can print terms; NBSP test variant is a no-op; no CI coverage when local list absent; ngrams() export missing. Minor: invalid snippet in phase1 plan doc.
Ruling: fix all — check-history prints only commit/file/line numbers (never text); NBSP via   escape; findBanned(text, hashes=BANNED_HASHES) + committed synthetic-term tests + non-empty hash-set test; export ngrams(tokens,n) and use it; fix doc snippet — the tool's purpose is non-disclosure and the tests must guard the mechanism on clean clones — cost if wrong: none.
Task 0: fix round 1/5 (4 addressed, 1 open — NBSP escape; commits b8833ab..8841bc8)
Task 0: fix round 2/5 (1 addressed, 0 open; commits 8841bc8..aa99a13)
Task 0: complete (commits 1c0cb2a..aa99a13, review clean)
Task 1: implementer done aa99a13..d4422d7, in review
Task 1: review — Approved; Important (plan-mandated): no try/catch around sharp calls in check-assets.mjs, a corrupt image/missing mask crashes the run.
Ruling: fix (per-entry try/catch → FAIL line, continue) — later tasks rely on the checker reporting all failures — cost if wrong: none.
Task 1: minor (deferred): extensionless filename parsing; double statSync; no CLI-level tests.
Task 1: fix round 1/5 (1 addressed, 0 open; commits d4422d7..4715dce)
Task 1: complete (commits aa99a13..4715dce, review clean)
Task 1: minor (deferred): CLI test temp dir not cleaned up
Task 2: Steps 1-2 done; controller + Rodolfo confirmed model = Coffee Grinder/ensemble v59. Decision (Rodolfo): renders show doser config (funnel_doser on, ensemble_funnel/funnel_wide off); 3D viewers = one GLB per config (doser, wide funnel).
Task 2: Step 3 done — USDZ (createUSDExportOptions) + STL/manifest fallback for configs doser & wide in $BRAND/brand/site-renders/grinder/export/. Doser iso screenshot verified by controller; wide screenshot stale (viewport cache) but geometry verified via bbox/manifest.
Ruling: Task 2 has no repo diff; its review gate is the Task 4 Blender import check (both configs import with colours and correct transforms) — output is external files, not code — cost if wrong: re-export in Task 4.
Task 2: complete (external outputs; verified at T4 import)
Task 3: implementer done 4715dce..b8c863b (script outside repo: $BRAND/brand/site-renders/wall_lamp_site.py); controller visually checked full-res cover; in review
Task 3: note — implementer used a different Co-Authored-By model line; history is squashed before push, trailers normalized then
Task 3: review — Important: mirror disc solid black on cover vs split in hero/poses.
Ruling: accept — the disc is a near-perfect mirror (roughness 0.02) reflecting the dark room; reflection depends on camera distance, and cover's camera is farther back — physically correct, not an artifact — cost if wrong: one inconsistent-looking disc on the cover; re-render with a closer cover camera.
Task 3: minor (deferred): two-line comment + multi-line docstrings in wall_lamp_site.py (outside repo).
Task 3: minor (deferred): constraints.md 70-80% fill wording vs cover fillMin 0.5 override.
Task 3: complete (commits 4715dce..b8c863b, 1 parked)
Task 4: implementer done b8c863b..84d8e33 (range also contains controller plan commits 7faf4fe, 5abcb37, 459aa85 — docs only). Controller: hero render checked; both GLBs load in model-viewer (~1 s local), base colours neutral.
Ruling: grinder viewers use model-viewer's neutral environment (add optional `environment` prop to Model3D in Phase 3 Task 3) — the default outdoor HDR tints white plastic olive — cost if wrong: none.
Ruling: keep GLB triangle counts (569k / 1.1M) — load fine on desktop, Phase 4 lazy-loads viewers on approach — cost if wrong: sluggish rotation on older phones; decimate later.
Task 4: review — Critical: angle-3 background flat grey (steep 42° elevation drops the dark backdrop); Important: angle-3 doesn't show hopper mouth; unprefixed globals contradict report; material mapping duplicated between grinder_scene.py and grinder_glb.py. Minor: colour naming, MB/MiB.
Ruling: fix angle-3 (re-solve camera so backdrop gradient matches the set; if the mouth can't be shown without losing the backdrop, prefer consistency and make angle-3 a rear 3/4 view), factor materials into grinder_materials.py, prefix globals — cost if wrong: none.
Task 4: fix round 1/5 (angle-3 background, globals, shared materials; d489293) — controller found cove rim wedge
Task 4: fix round 2/5 (cove wall height; 1e819f7) — controller found floor/wall crease
Task 4: fix round 3/5 (angle-3 elevation matched to angle-1/2; c1c0323) — controller verified contact sheet + crease numbers
Ruling: image-only fix rounds verified by the controller directly (crop inspection + numeric checks) instead of a re-review subagent — the defects are visual and the controller holds the reference set — cost if wrong: a subtle visual defect slips to Phase 3 browser pass.
Task 4: minor (deferred): angle-1 floor specular highlight (not a seam).
Task 4: complete (commits b8c863b..c1c0323, review clean after 3 fix rounds)
Task 5: implementer done c1c0323..63fff1e; controller review: cover inconsistent (flat grey, steep camera)
Task 5: fix round 1/5 (camera bearing/elevation + 20 m cove; e546d35) — controller verified full-res cover
Task 5: complete (commits c1c0323..e546d35, controller-verified; image-only)
Task 6: implementer done e546d35..8de38f0; controller review of screenshots: label collisions, inconsistent font sizes, mobile dead space, mobile standby semantics
Task 6: fix round 1/5 (d72fd35) — controller verified fresh screenshots (c3 slices)
Task 6: minor (deferred to Phase 3 Task 5): RaiBudgetArchitecture pg_cron arrow ends short of the LLM analysis box
Task 6: complete (commits e546d35..d72fd35, controller-verified)
Rodolfo (2026-09-26): grinder renders + 3D use ONLY the right-hand viewer config (wide.glb = funnel + doser); single 3D viewer. Queued as Task 4b after Task 7: re-render cover/hero/angle-1..3 from the wide config (same cameras/house look), keep wide.glb, remove doser.glb + its manifest entry.
Task 4b: renders re-done from wide (funnel + doser) config — controller verified contact sheet: enclosed funnel, matches Rodolfo's right-hand viewer; not yet committed (waiting on Task 7 to release the manifest).
Ruling: accept implementer's "duplicate geometry" finding as benign — ensemble_funnel repeats some tower parts inside the same bounds; renders are correct; wide.glb carries ~2x triangles (1.1M) — cost if wrong: heavier 3D viewer; dedupe coincident bodies later.
Rodolfo (2026-09-26): RaiBudget screenshots phone size only, no macOS window capture (drops budget-dashboard-mac.webp from Task 8 and from the Phase 3 RaiApps page).
Task 4c: complete (commit 5f3dea6; active Fusion doc ensemble v59, funnel_doser off, 0 duplicates, wide.glb 555k tris 2.66 MB; controller verified contact sheet)
Rodolfo (2026-09-26): renders must be high-res like the desk-lamp originals. Ruling: new slot sizes cover 2560x1600, tall 2000x2500, tile 1600x1600, webp q90; desk hero/paper from 2000x2500 originals unresized; responsive downscaling in Phase 3/4 via Astro Image. Queued Task 4d (grinder, wall lamp, desk cover re-render) after screenshots.
Task 7: complete (commit d3470ad; emulator captures after sandbox/gpu diagnosis; controller privacy + quality review of all 4 screenshots passed; Analysis tab needs sign-in so 4th is Progress charts)
Ruling: Task 8 captures RaiBudget on the same emulator via a screenshot-only entrypoint (lib/main_screenshots.dart in a scratch worktree) with fake provider overrides and PIN bypass — consistent device look with RaiClimbing, never touches Supabase/Plaid — cost if wrong: fall back to golden tests.
Rodolfo (2026-09-26): RaiClimbing Analysis screen wanted (fake report via screenshot entrypoint); fake data must be varied/realistic, not uniform — applies to RaiBudget Task 8 too (irregular spending, some overspent categories, uneven months, realistic merchants, a fake analysis report).
Task 7b: complete (commit ea84778; 6 screenshots: today, plan, climbs, charts, report, recs; varied V4-V10 board/gym/outdoor data; controller privacy/quality review passed)
Task 7: minor (deferred): visible Climbs list all dated Sep 25 (recent-first view)
Task 8: first pass committed (6 budget-* shots). Rodolfo: data not interesting enough; analysis reports must match the depth of his real reports.
Ruling (Rodolfo-authorized): implementers may read the real local report files (raibudget-report.json, raibudget-investments-report.json, raiclimbing-report.json — local copies of the cloud reports) ONLY as a structure/depth template; all values and prose rewritten for the fake data; leak check (no shared 5-word sequences, no copied non-trivial numbers) before commit; real files never copied into repo or scratch outputs — cost if wrong: residual real phrasing in a screenshot; mitigated by leak check + controller review.
Rodolfo (2026-09-26): RaiBudget investments data + investments analysis screenshots as a separate part of the RaiApps page.
Rodolfo (2026-09-26): drop RaiUsage and RaiDrive entirely; RaiApps = RaiBudget (first) then RaiClimbing. Task 9: skipped by decision. Phase 5 knowledge update: remove RaiUsage/RaiDrive from raiapps.md/projects-overview.md.
Task 8: round 2 complete (10 budget-* screenshots incl. investments group; leak check 0/0; controller privacy + quality review passed)
Task 8: complete
Ruling: run Task 7c (RaiClimbing full-depth analysis, emulator) and Task 4d (hi-res re-renders, Blender) in parallel — disjoint files (raiapps/climbing-* vs artifacts/{grinder,wall-lamp,desk-lamp}), 4d does not edit the manifest, both stage explicit paths — cost if wrong: a commit race, trivially rebased.
Task 7c: complete (commit 0d02384; implementer declined to read the real report under its original hard rule — built to the controller-supplied structure counts instead, so real data was never read; controller reviewed depth + privacy)
Emulator: stopped by controller; site_shots AVD deleted; rai_test untouched.
Task 4d: complete (commit 1444132; hi-res slots 2560x1600 / 2000x2500 / 1600x1600 q90; controller verified native-res crop sharpness)
Task 4d: minor (deferred): desk-lamp hero source render (original, pre-existing) has a faint horizon seam — Rodolfo's own render, left as is.
Task 9: skipped (Rodolfo dropped RaiUsage/RaiDrive).
Final review: 0 critical, 6 important, 9 minor; no leaks found.
Ruling (#6): serve public/artifacts originals as-is (renders 23–53 KB, screenshots 59–160 KB) with explicit width/height + lazy loading; no Astro Image transforms — files are already small — cost if wrong: slightly heavier mobile loads.
Ruling (#7): switch banned-term hashes to HMAC-SHA256 with a local gitignored key (v2/.banned-key.local); without the key the real-term matcher is inert and only synthetic tests run — prevents confirming guessed names from public hashes — cost if wrong: clean clones can't enforce the ban (no CI runs it anyway).
Ruling: one fix dispatch for #1–#5, #7–#12 (+ T1 temp-dir cleanup); controller updates plans (#14); #13 handled by squash at push; #15 leave.
Final fix wave: 4 commits; controller visually verified diagrams (grinder tap flow, RaiBudget Plaid via edge functions, wall-lamp mobile routing)
Phase 2: minor (deferred): WallLampDrive mobile '(early, superseded)' text overflows its dashed box; RaiBudgetArchitecture 'checks every few hours' grazed by arrow
Final fix wave re-review: all addressed (44/44 tests; check-history output text-free).
Phase 2: COMPLETE (Task 9 skipped by decision).
Rodolfo (2026-09-26): diagrams only for the apps, none for the lamps, orthogonal (right-angle) arrows only, higher quality.
Ruling: "apps" = RaiBudget, RaiClimbing, and the site chat assistant; remove the other 8 diagrams (lamps, grinder, Tobias, TidyNET, Pruning); rebuild the 3 on a shared data-driven OrthoDiagram component — cost if wrong: re-add a diagram later on request.
Rodolfo (2026-09-26): diagrams only for RaiBudget, chat assistant, TidyNET (RaiClimbing dropped, TidyNET added); high quality.
Diagrams v2: complete (539d799; RaiBudget, ChatRag, TidyNET on OrthoDiagram engine; controller reviewed all screenshots)
