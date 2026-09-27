# Site Refresh — Prose Pass Implementation Plan (runs before the chat phase)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite every piece of visible copy and the chat knowledge base in Rodolfo's own voice, casual and concrete, so the site reads like a person's site that also works as a portfolio.

**Architecture:** Copy-only changes to MDX pages, a few Astro components, `site.ts`, and `v2/knowledge/*.md`. Two local, gitignored guides drive the writing: `.superpowers/voice-guide.md` (Rodolfo's voice) and `.superpowers/positioning.md` (safe public facts and exclusions). Every block also passes the `humanizer` skill. A separate reviewer checks all copy against both guides.

**Tech Stack:** Astro 5 MDX, the `humanizer` skill.

**Spec:** `docs/superpowers/specs/2026-09-25-site-refresh-design.md`

## Global Constraints

- Voice: follow `.superpowers/voice-guide.md` (current register). First sentence defines, second complicates. Exact figures or none. No hype, no intensifiers, no exclamation marks, no rhetorical questions except "Why X instead of Y?" headings. Admit what didn't work. At most one dry aside every few paragraphs. Casual and contractions are fine; no slang, no emoji.
- No em dashes (U+2014) anywhere (Rodolfo, overrides the voice guide). Numeric ranges may use an en dash.
- Humanizer pass on every block.
- Keep verbatim: the intro opening line "I build at the intersection of deep learning, reinforcement learning, and robotics. The goal is usually to get algorithms to do something useful in the physical world."
- Personal site first; robotics identity stays prominent; positioning from `.superpowers/positioning.md` is woven in lightly, never as a pitch.
- Facts only from `v2/knowledge/*.md` and `.superpowers/positioning.md`. Everything in the "Never on the site" list stays off, including in alt text and the knowledge base.
- No "X is my name for Y" or other self-referential/meta sentences ("this page", "kept as it stands").
- Don't change layout, components, media, or frontmatter other than `summary`, `coverAlt`, and alt text/captions. Titles stay (chat project title set in Phase 4 fixes).
- Stage explicit paths; don't push.

- Personal notes from Rodolfo to include (his words, lightly shaped): the grinder and the desk lamp are things he uses every day. Grinder: he makes espresso daily and built it because he got tired of grinding by hand. Desk lamp: he sometimes finds himself distracted just watching the core rise and fall. One or two short sentences each, dry, no gushing.

---

### Task 1: Project pages, batch A (Tobias, RaiApps, Desk Lamp, Grinder)

- [ ] Rewrite prose, `summary`, captions, and alt text for `tobias.mdx`, `raiapps.mdx`, `desk-lamp.mdx`, `grinder.mdx`. Word targets: 300–550 each (RaiApps up to 800). RaiApps opens by defining the two apps plainly (no "RaiApps is my name for").
- [ ] Humanizer pass per page; `npm test && npm run build`; one commit per page.

### Task 2: Project pages, batch B (TidyNET, Wall Lamp, Pruning, RAG Chat Assistant)

- [ ] Same treatment for `knolling.mdx`, `wall-lamp.mdx`, `pruning.mdx`, `chat-project.mdx`. The chat page describes what the chat phase will ship (Cohere embed-v4.0 + rerank-v4.0-fast over Pinecone, Command A with documents, streamed replies, origin checks and rate limits).
- [ ] Humanizer; test/build; one commit per page.

### Task 3: Site copy

- [ ] Intro (`Hero.astro`): keep the opening line verbatim; rewrite the role paragraph into 2–3 short sentences that say what he does at Pindrop in plain words and link the two public bylined articles (see positioning notes), no bank names, no pitch. Keep Columbia Creative Machines Lab mention.
- [ ] `site.ts` meta description, `LifeOutside.astro` and `hobbies.astro` copy, footer strings, `chat.astro` intro text, chat widget greeting/placeholder (`ChatWidget.tsx` strings only), `404.astro`, `/projects` index intro.
- [ ] Humanizer; test/build; commit "Rewrite site copy in Rodolfo's voice".

### Task 4: Knowledge base sync

- [ ] Update `v2/knowledge/*.md` so every fact on the pages is present and consistent (third person, naming Rodolfo, 60–200 words per section): add the two Pindrop articles with their public numbers to `experience.md`/`about.md`; add RaiApps features visible in screenshots (net worth tile, holdings, allocation, drift); desk lamp without the earlier-versions history if the page dropped it; chat assistant with the shipping pipeline; remove anything now off the site. Neutral wording, no private-life details.
- [ ] `node --test` banned-term test over knowledge passes; commit "Sync chat knowledge with site copy".

### Task 5: Voice review

- [ ] A reviewer reads every page, the intro, and site copy against both guides and the humanizer checklist; lists every sentence that breaks a rule (file:line, rule, suggested rewrite) and any fact not supported by the knowledge files, and any page whose body repeats a link that the bottom links block already has (all links live only in the bottom block). One fix round; re-review of the fixed lines only.
