# SDD ledger — plan: docs/superpowers/plans/2026-09-25-phase1-content-foundation.md
Spec: docs/superpowers/specs/2026-09-25-site-refresh-design.md

## Pre-flight scan
| Pair / task | Shared file or interface | Finding |
|---|---|---|
| T1 self | package.json test script | Script already exists (`node --test tests/*.test.mjs`) from indexer commit 5c8292a; T1 Step 2 is a no-op |
| T1 self | test expectations (Step 3) | Expected failures listed; artifact-regex may also catch other paths (e.g. video dirs) — unknown until run |
| T1 → T2/T3/T4 | content.test.mjs assertions | T2/T3/T4 each clear a subset of T1 failures; consistent |
| T2 ↔ T3 | netlify.toml + v2/netlify.toml | Both append redirects; sequential, no overlap |
| T3 ↔ T4 | grinder.mdx | T3 sets `order: 3`, T4 removes viewers/model3d; different lines, compatible |
| T3 self | desk-lamp.mdx body | Body may still contain C6 / brushless_lamp links; T3 Step 3 handles |
| T5 self | humanizer skill | Implementer may lack Skill tool; apply humanizer rules manually if so |
| T6 self | browser verification | Needs browser pane tools — controller runs it |
| All | v2/knowledge/ (untracked, being written by another agent) | Tasks must stage explicit paths only, never `git add -A` at repo root |

## Rulings
Ruling: T1 Step 2 skipped (script exists) — already in package.json — cost if wrong: none.
Ruling: T2–T5 batched into one implementer dispatch and reviewed as one unit — small independent content edits — cost if wrong: one larger review diff.
Ruling: T6 run by controller (build + tests via Bash, browser via preview tools) — only controller has browser tools — cost if wrong: none; no code fixes done by controller.

## Progress
Task 1: implementer done a9aad00 (base 24186eb), in review
Task 1: review — Important (plan-mandated): content.test.mjs BANNED regex duplicates a narrower subset of scripts/lib/banned.mjs, so src/public are unguarded against the startup, paper, and awards terms.
Ruling: use findBanned() from scripts/lib/banned.mjs in content.test.mjs instead of the local BANNED regex — spec bans those terms site-wide and one canonical list prevents drift — cost if wrong: a future legit word matching the list fails the test (caught immediately, easy to adjust).
Task 1: fix round 1/5 dispatched (commit d4dde3f); side note: knowledge base committed separately (not a plan task); index built in namespace v2-20260926 (71 records)
Task 1: fix round 1/5 (1 addressed, 0 open; commits a9aad00..d4dde3f)
Task 1: complete (commits 24186eb..d4dde3f, review clean)
Tasks 2-5: implementer done 9b6625d..bd3718e, in review
Tasks 2-5: complete (commits 9b6625d..bd3718e, review clean)
Tasks 2-5: minor (deferred): desk-lamp.mdx body still says 'Brushless lamp' / 'kinetic smart lamp' — Phase 3 rewrite
Task 6: controller verification started
Task 6: complete (tests 14/14, build clean, browser checks at 1440/390 pass, no artifact 404s)
Final review: ready for Phase 2; 0 critical, 4 important, 8 minor.
Ruling: fix now in one dispatch — I1 (findBanned normalization), I2 (indexer empty-source/prune guard + namespace regex), Minor 1 (raidrive stopgap 302), Minor 2/3/4/6 (content test holes) — they guard Phase 2 asset renames and cost little — cost if wrong: small extra diff.
Ruling: park I3 (embed model default split chat.ts v3 vs indexer v4) to Phase 5 cut-over — cut-over is Phase 5 work; live function untouched until then — cost if wrong: silent junk retrieval if someone flips namespace env alone; mitigated by spec note.
Ruling: park I4 (redirects untested on Netlify) as a pre-merge gate: curl -sI each redirected path on a deploy preview before merging to main — needs Netlify deploy (user-gated) — cost if wrong: broken old URLs.
Minor 5 widened: desk-lamp body C6 vs S3 contradiction + alt text — Phase 3; do not merge to main before Phase 3.
Minor 7, 8: left (intentional wording; backup worked at 100).
Final fix wave: commits e58d1a4..627c1e4; re-review: all 4 addressed.
Final: minor (parked): artifact regex swallows trailing punctuation after /artifacts/ in prose (no current hits) — tighten when it bites.
Final: minor (parked): pruneDecision totalCount is post-upsert — looser 50% guard; acceptable.
Phase 1: COMPLETE. Not merged (merge to main gated on Phase 3 + Netlify redirect curl check).
