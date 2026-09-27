# Site Refresh — Phase 1: Content Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove retired projects, private GitHub links, and broken 3D viewers from the live site, rename the lamp page, and add an automated content guard that later phases keep green.

**Architecture:** Content-only changes to the Astro content collection plus redirects in both `netlify.toml` files. A dependency-free `node:test` suite (`v2/tests/content.test.mjs`) enforces the spec's content rules (asset existence, GitHub allowlist, brand-name ban, retired slugs) and runs via `npm test`.

**Tech Stack:** Astro 5 content collections (MDX), Netlify redirects, Node 22 `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-25-site-refresh-design.md`

**Phase roadmap (one plan per phase, written when the previous phase lands):**
1. Content foundation — this plan.
2. Asset production — grinder Fusion→Blender renders + GLB, desk/wall lamp renders, SVG diagram components, fake-data app screenshots, `check-assets.mjs`.
3. Project pages — new MDX components, rewritten pages, RaiApps, desk/wall lamp pages, humanizer pass.
4. Frontend polish — View Transitions, motion, mobile, performance, a11y.
5. Chat — indexer, hardening, rerank, streaming, model upgrade, eval.

User-gated items (never done without Rodolfo's explicit go-ahead): rotating Cohere/Pinecone keys, setting Netlify env vars, force-pushing the scrubbed history, merging/pushing to `main`.

## Global Constraints

- No brand names anywhere in `v2/src`, `v2/public` filenames, alt text, or the chat index: the lamp brand's name or either lamp's product name (case-insensitive).
- `links.github` only for public repos: `tobias`, `TidyNET`, `computation_brain`, `grinder`, `RaiUsage`, `RoodsBurger.github.io` (owner `RoodsBurger`).
- Removed projects: Wallet, Plex File Manager, standalone RaiDrive.
- Lamp slug becomes `desk-lamp`, title "Rising-Core Desk Lamp".
- Do not add the paper, awards, or the startup.
- Hosting is Netlify; root `netlify.toml` builds `base = "v2"`. Keep root and `v2/netlify.toml` redirects identical.
- Code comments: single line, describe current behavior only.
- Work on branch `site-refresh`; do not push.

---

## File Structure

- Create `v2/tests/content.test.mjs` — content rules as tests; no dependencies.
- Modify `v2/package.json` — add `"test": "node --test tests/*.test.mjs"`.
- Delete `v2/src/content/projects/wallet.mdx`, `plex.mdx`, `raidrive.mdx`.
- Delete `v2/public/artifacts/wallet_render.webp`, `plex1.webp`, `plex2.webp`, `raidrive1.webp`, `raidrive2.webp`.
- Rename `v2/src/content/projects/lamp.mdx` → `desk-lamp.mdx`; edit frontmatter.
- Modify `v2/src/content/projects/grinder.mdx` — remove missing-GLB viewers.
- Modify `v2/src/components/About.astro` — Pindrop role wording.
- Modify `netlify.toml` and `v2/netlify.toml` — redirects.

---

### Task 1: Content guard test suite

**Files:**
- Create: `v2/tests/content.test.mjs`
- Modify: `v2/package.json` (scripts)

**Interfaces:**
- Produces: `npm test` (run from `v2/`) — later phases add assertions to this file; exported helpers `projectFiles()`, `frontmatter(src)` are module-local.

- [ ] **Step 1: Write the failing tests**

```js
// v2/tests/content.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const projectsDir = join(root, "src/content/projects");

const PUBLIC_REPOS = new Set(["tobias", "TidyNET", "computation_brain", "grinder", "RaiUsage", "RoodsBurger.github.io"]);
const BANNED = /* case-insensitive regex matching the lamp brand's name or either lamp's product name */ null;
const RETIRED = ["wallet", "plex", "raidrive", "lamp"];

const projectFiles = () => readdirSync(projectsDir).filter((f) => f.endsWith(".mdx"));
const read = (f) => readFileSync(join(projectsDir, f), "utf8");
const frontmatter = (src) => src.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

test("every /artifacts path referenced by a project exists in public/", () => {
  const missing = [];
  for (const f of projectFiles()) {
    for (const [, path] of read(f).matchAll(/["'(](\/artifacts\/[^"')\s]+)/g)) {
      if (!existsSync(join(root, "public", path))) missing.push(`${f}: ${path}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("GitHub links point only at public RoodsBurger repos", () => {
  const bad = [];
  for (const f of projectFiles()) {
    for (const [, repo] of read(f).matchAll(/github\.com\/RoodsBurger\/([^/"')\s#]+)/g)) {
      if (!PUBLIC_REPOS.has(repo)) bad.push(`${f}: ${repo}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("no brand names in site source or public filenames", () => {
  const hits = [];
  for (const p of walk(join(root, "src"))) {
    if (BANNED.test(readFileSync(p, "utf8"))) hits.push(p.slice(root.length));
  }
  for (const p of walk(join(root, "public"))) {
    if (BANNED.test(p.slice(root.length))) hits.push(p.slice(root.length));
  }
  assert.deepEqual(hits, []);
});

test("retired project slugs are gone", () => {
  const slugs = projectFiles().map((f) => f.replace(/\.mdx$/, ""));
  assert.deepEqual(slugs.filter((s) => RETIRED.includes(s)), []);
});

test("every project frontmatter has title, summary, cover, coverAlt", () => {
  for (const f of projectFiles()) {
    const fm = frontmatter(read(f));
    for (const key of ["title", "summary", "cover", "coverAlt"]) {
      assert.match(fm, new RegExp(`^${key}:`, "m"), `${f} missing ${key}`);
    }
  }
});
```

- [ ] **Step 2: Add the npm script**

In `v2/package.json` `"scripts"`, add after `"preview"`:

```json
    "test": "node --test tests/*.test.mjs",
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd v2 && npm test`
Expected: FAIL on
- missing artifacts: `grinder.mdx: /artifacts/grinder1.glb`, `grinder2.glb`, `wallet.mdx: /artifacts/wallet.glb`, `wallet2.glb`
- GitHub: `lamp.mdx: brushless_lamp`, `plex.mdx: plex_file_manager`, `raidrive.mdx: raidrive`
- retired slugs: `lamp`, `plex`, `raidrive`, `wallet`
- brand names: expected PASS already (if it fails, list hits and treat as extra cleanup)

- [ ] **Step 4: Commit the failing suite**

```bash
git add v2/tests/content.test.mjs v2/package.json
git commit -m "test: add content guard suite for site refresh rules"
```

---

### Task 2: Remove Wallet, Plex, RaiDrive

**Files:**
- Delete: `v2/src/content/projects/wallet.mdx`, `plex.mdx`, `raidrive.mdx`
- Delete: `v2/public/artifacts/wallet_render.webp`, `plex1.webp`, `plex2.webp`, `raidrive1.webp`, `raidrive2.webp`
- Modify: `netlify.toml`, `v2/netlify.toml`

- [ ] **Step 1: Confirm assets are unused elsewhere**

Run: `cd v2 && grep -rn -E "wallet_render|plex[12]\.webp|raidrive[12]\.webp" src`
Expected: matches only in the three MDX files being deleted.

- [ ] **Step 2: Delete files**

```bash
cd v2
git rm src/content/projects/wallet.mdx src/content/projects/plex.mdx src/content/projects/raidrive.mdx
git rm public/artifacts/wallet_render.webp public/artifacts/plex1.webp public/artifacts/plex2.webp public/artifacts/raidrive1.webp public/artifacts/raidrive2.webp
```

- [ ] **Step 3: Update redirects in BOTH `netlify.toml` and `v2/netlify.toml`**

Replace the existing wallet block:

```toml
[[redirects]]
  from = "/projects/wallet.html"
  to = "/projects/wallet"
  status = 301
```

with:

```toml
[[redirects]]
  from = "/projects/wallet.html"
  to = "/#projects"
  status = 301

[[redirects]]
  from = "/projects/wallet"
  to = "/#projects"
  status = 301

[[redirects]]
  from = "/projects/plex"
  to = "/#projects"
  status = 301

# Points to the home grid until the RaiApps page exists (Phase 3 retargets to /projects/raiapps).
[[redirects]]
  from = "/projects/raidrive"
  to = "/#projects"
  status = 301
```

- [ ] **Step 4: Verify both files match**

Run: `diff <(sed -n '/\[\[redirects\]\]/,$p' netlify.toml) <(sed -n '/\[\[redirects\]\]/,$p' v2/netlify.toml)`
Expected: no output.

- [ ] **Step 5: Run tests**

Run: `cd v2 && npm test`
Expected: wallet/plex/raidrive failures gone; `lamp` and grinder GLB failures remain.

- [ ] **Step 6: Commit**

```bash
git add -A v2/src/content/projects v2/public/artifacts netlify.toml v2/netlify.toml
git commit -m "Remove Wallet, Plex, and standalone RaiDrive projects"
```

---

### Task 3: Rename lamp page to desk-lamp and drop private link

**Files:**
- Rename: `v2/src/content/projects/lamp.mdx` → `v2/src/content/projects/desk-lamp.mdx`
- Modify: frontmatter of the renamed file
- Modify: `netlify.toml`, `v2/netlify.toml`

- [ ] **Step 1: Rename**

```bash
cd v2 && git mv src/content/projects/lamp.mdx src/content/projects/desk-lamp.mdx
```

- [ ] **Step 2: Edit frontmatter**

Replace the frontmatter block of `desk-lamp.mdx` with:

```yaml
---
title: "Rising-Core Desk Lamp"
summary: "A kinetic desk lamp where a brushless motor raises a lit core to set brightness, with a knob and Matter over WiFi."
tags: ["ESP32-S3", "BLDC", "SimpleFOC", "Matter", "ESP-IDF"]
category: ["code", "cad"]
order: 2
cover: "/artifacts/lamp_cover.webp"
coverAlt: "Rising-core desk lamp"
model3d: "/artifacts/lamp_open.glb"
---
```

(The `links` block is removed entirely. Body is rewritten in Phase 3.)

- [ ] **Step 2b: Apply the spec's lineup order to the other projects**

Set `order:` in each frontmatter so the lineup matches the spec (RaiApps = 5 and wall lamp = 6 arrive in Phase 3):

| File | order |
|---|---|
| `tobias.mdx` | 1 |
| `desk-lamp.mdx` | 2 |
| `grinder.mdx` | 3 |
| `knolling.mdx` | 4 |
| `pruning.mdx` | 7 |
| `chat-project.mdx` | 8 |

Run: `grep -H "^order:" src/content/projects/*.mdx`
Expected: exactly the values above, no duplicates.

- [ ] **Step 3: Scan the body for brand names and the C6 branch**

Run: `grep -n -i -E "c6|brushless_lamp" src/content/projects/desk-lamp.mdx` (also confirm the lamp brand's name and both lamps' product names are absent).
Expected: no brand hits. Any `brushless_lamp` GitHub link in the body is deleted; mentions of "C6" stay until Phase 3 rewrites the body.

- [ ] **Step 4: Add redirect to BOTH netlify.toml files (append)**

```toml
[[redirects]]
  from = "/projects/lamp"
  to = "/projects/desk-lamp"
  status = 301
```

- [ ] **Step 5: Run tests**

Run: `cd v2 && npm test`
Expected: only grinder GLB failures remain.

- [ ] **Step 6: Commit**

```bash
git add -A v2/src/content/projects netlify.toml v2/netlify.toml
git commit -m "Rename lamp project to desk-lamp and drop private repo link"
```

---

### Task 4: Remove broken grinder 3D viewers

**Files:**
- Modify: `v2/src/content/projects/grinder.mdx`

- [ ] **Step 1: Edit frontmatter**

Delete the line `model3d: "/artifacts/grinder1.glb"`. Keep `links.github` (public repo).

- [ ] **Step 2: Remove the viewer block from the body**

Delete the `import Model3DPair from "@/components/Model3DPair.astro";` line and the whole `<Model3DPair items={[ ... ]} />` element referencing `grinder1.glb` / `grinder2.glb`. Delete any paragraph describing the 3D viewers or "binary STL".

- [ ] **Step 3: Fix the speed range claim**

Run: `grep -n -i -E "0.?(–|-|to).?300|rpm" v2/src/content/projects/grinder.mdx`
Replace any statement of a 0–300 RPM range with: "Grind speed is adjustable from 30 to 150 RPM at the burr." (Full rewrite happens in Phase 3.)

- [ ] **Step 4: Run tests**

Run: `cd v2 && npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add v2/src/content/projects/grinder.mdx
git commit -m "Remove grinder 3D viewers whose models are missing"
```

---

### Task 5: Pindrop role on landing page

**Files:**
- Modify: `v2/src/components/About.astro` (the muted `<p>` under About)

- [ ] **Step 1: Replace the role paragraph text**

```astro
        <p class="text-(--color-muted-foreground)">
          Research Scientist on Pindrop's Authentication &amp; ID Research
          team since 2025. Before that, a graduate research assistant at
          Columbia's Creative Machines Lab.
        </p>
```

- [ ] **Step 2: Humanizer pass**

Invoke the `humanizer` skill on the two About paragraphs; apply only edits that keep meaning and the understated voice. No new claims.

- [ ] **Step 3: Commit**

```bash
git add v2/src/components/About.astro
git commit -m "Update About with current Pindrop role"
```

---

### Task 6: Build and browser verification

**Files:** none modified unless a check fails.

- [ ] **Step 1: Type-check and build**

Run: `cd v2 && npm run build`
Expected: `astro check` reports 0 errors; build completes; `dist/projects/desk-lamp/index.html` exists; `dist/projects/{wallet,plex,raidrive,lamp}` do not.

- [ ] **Step 2: Run tests again**

Run: `cd v2 && npm test`
Expected: all PASS.

- [ ] **Step 3: Browser check**

Start `v2-dev` via `preview_start` (`.claude/launch.json` in `v2/`). Check at 1440 px and 390 px:
- Home: spotlight lists, in order, Tobias, Rising-Core Desk Lamp, Precision Coffee Grinder, TidyNET, Artificial Synaptic Pruning, LLM-Based Assistant; no Wallet/Plex/RaiDrive.
- `/projects/desk-lamp` opens the modal with the lamp GLBs; no GitHub button.
- `/projects/grinder` has no empty viewer frames.
- `/projects` index shows the same six projects.
- Console: no 404s for `/artifacts/*`.
Stop the preview server afterwards and confirm with `pgrep -fl "astro dev"` (empty).

- [ ] **Step 4: Commit any fixes, then report**

Report to Rodolfo: commits on `site-refresh`, test output, screenshots. Do not push.
