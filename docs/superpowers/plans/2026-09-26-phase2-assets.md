# Site Refresh — Phase 2: Asset Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce every image, video, 3D model, and diagram the Phase 3 project pages need, correctly framed and verified, and remove unreleased brand names from everything tracked in the public repo.

**Architecture:** Raster assets land in `v2/public/artifacts/<project>/` under neutral names, listed in `v2/assets.manifest.json` with their slot ratio and checked by `v2/scripts/check-assets.mjs` (sharp). Renders are produced by Blender scripts that live OUTSIDE the public repo (in the private brand folder, referred to here as `$BRAND` = `~/Documents/Personal Projects/<brand-folder>`), because they reference unreleased names and materials. Diagrams are Astro SVG components in `v2/src/components/diagrams/` using `currentColor` and CSS tokens. App screenshots come from the real apps running on fake data.

**Tech Stack:** Node 22 + sharp, Blender 5.1 (Cycles, Metal), Fusion 360 MCP (`fz.py` client, `127.0.0.1:52435/mcp`), ffmpeg, Flutter, Android emulator (`rai_test`), Xcode, Astro 5.

**Spec:** `docs/superpowers/specs/2026-09-25-site-refresh-design.md`

**Execution notes:** Tasks 3–5 are long-running renders; run Blender headless with explicit sample counts, one job at a time, and confirm no Blender/Fusion runner processes remain after each task (`pgrep -fl "Blender|fz.py"` empty). Tasks 7–9 start emulators/simulators; shut them down at task end.

## Global Constraints

- The public repo (`RoodsBurger/RoodsBurger.github.io`) must contain no unreleased brand or product names or excluded terms in any tracked file, filename, or commit on `site-refresh` before it is pushed. The plain-text term list lives only in the gitignored `v2/.banned-terms.local`.
- Lamps are "Rising-Core Desk Lamp" (slug `desk-lamp`) and "Kinetic Wall Lamp" (slug `wall-lamp`). Wall lamp: no angle specs. Lamp disclosure: renders, minimal mechanism diagrams, high-level electronics only; no PCB layouts, board photos, BOMs, section drawings.
- Framing: render at the slot ratio, never crop after. Slots: **cover 16:10** (1600×1000), **tall 4:5** (1600×2000), **tile 1:1** (1200×1200), **wide 3:2** (1800×1200). Subject fills 70–80% of frame height with ≥8% margin every side. Covers: subject in the upper 65% (spotlight caption overlays the bottom ~35%).
- House look for product renders (grinder, desk lamp): the desk-lamp studio scene (dark seamless floor, key/rim/fill, 85 mm lens). Wall lamp: the `reflexo` wall scene (wall plates lit by the puck).
- Formats: stills `.webp` (quality 86) in `v2/public/artifacts/<slug>/`; video `.webm` (VP9) + `.mp4` (H.264) ≤ 3 MB each; GLB Draco-compressed ≤ 6 MB each.
- App screenshots: fake data only. Never read, copy, or display `raibudget-data.json`, `raibudget-report.json`, `raibudget-investments-report.json`, `.secrets/`, `raiclimbing-data.json`, `raiclimbing-report.json`, `.backups/`, or real report fixtures. RaiBudget's second user is "Alex" in fake data.
- Grinder gets the interactive 3D viewer pair back (two GLBs), in addition to renders.
- Code comments: single line, current behavior only. Stage explicit paths only. Do not push.

---

## File Structure

- Modify `v2/scripts/lib/banned.mjs` — hash-based matcher; loads no plain-text terms.
- Create `v2/scripts/lib/banned-hashes.mjs` — SHA-256 hashes of normalized banned n-grams.
- Create `v2/scripts/hash-banned-terms.mjs` — regenerates the hash file from `v2/.banned-terms.local`.
- Modify `v2/tests/banned.test.mjs` — positives read from `v2/.banned-terms.local` (skipped when absent); negatives stay literal.
- Create `v2/scripts/check-history.mjs` — scans `git log -p main..HEAD` with `findBanned`; exit 1 on hit.
- Modify `docs/superpowers/specs/…design.md`, `docs/superpowers/plans/2026-09-25-phase1-content-foundation.md` — redact names.
- Create `v2/scripts/check-assets.mjs`, `v2/scripts/lib/asset-checks.mjs`, `v2/tests/asset-checks.test.mjs`, `v2/assets.manifest.json`.
- Create (outside repo) `$BRAND/brand/site-renders/` — `wall_lamp_site.py`, `desk_lamp_cover.py`, `grinder_scene.py`, `README.md`.
- Create `v2/public/artifacts/{desk-lamp,wall-lamp,grinder,raiapps}/…` assets.
- Create `v2/src/components/diagrams/*.astro` (10 diagrams) and `v2/src/components/project/Diagram.astro`.

---

### Task 0: Remove plain-text brand names from the public repo

**Files:** as listed above for banned-term hashing, history check, and doc redaction.

**Interfaces:**
- Produces: `findBanned(text) -> string|null` (unchanged signature; returns the matching n-gram from the input), `BANNED_HASHES: Set<string>`, `normalizeForBan(text) -> string`, `ngrams(tokens, n) -> string[]`.

- [ ] **Step 1: Create the local term list (gitignored)**

Create `v2/.banned-terms.local`, one term per line, lowercase, from the current regex in `v2/scripts/lib/banned.mjs` (write each regex alternation as its plain words, multi-word terms with single spaces). Append `.banned-terms.local` to `v2/.gitignore`. Verify: `git check-ignore -q v2/.banned-terms.local && echo ignored`.

- [ ] **Step 2: Write failing tests**

Replace `v2/tests/banned.test.mjs` with:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findBanned, normalizeForBan } from "../scripts/lib/banned.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const localList = join(root, ".banned-terms.local");
const terms = existsSync(localList) ? readFileSync(localList, "utf8").split("\n").map((s) => s.trim()).filter(Boolean) : [];

test("every locally listed term is flagged, including accent, apostrophe, and NBSP variants", { skip: !terms.length && "no .banned-terms.local" }, () => {
  for (const t of terms) {
    const variants = [t, t.toUpperCase(), `x ${t} y`, t.replace(/ /g, " "), t.replace(/'/g, "’"), t.normalize("NFD")];
    for (const v of variants) assert.ok(findBanned(v), JSON.stringify(v));
  }
});

test("ordinary words are not flagged", () => {
  for (const t of ["nucleotide", "hasten", "admiral", "mirage", "a nuclear option", "hello world", "dean list"]) {
    assert.equal(findBanned(t), null, t);
  }
});

test("normalizeForBan strips accents, apostrophes and punctuation to single spaces", () => {
  assert.equal(normalizeForBan("Café’s  AI-Image x"), "cafes ai image x");
});

test("banned.mjs source contains no plain-text terms", { skip: !terms.length && "no .banned-terms.local" }, () => {
  const src = readFileSync(join(root, "scripts/lib/banned.mjs"), "utf8") + readFileSync(join(root, "scripts/lib/banned-hashes.mjs"), "utf8");
  for (const t of terms) assert.equal(normalizeForBan(src).includes(normalizeForBan(t)), false, "leaks a term");
});

test("knowledge files contain no banned terms", () => {
  const dir = join(root, "knowledge");
  if (!existsSync(dir)) return;
  const hits = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => [f, findBanned(readFileSync(join(dir, f), "utf8"))]).filter(([, h]) => h);
  assert.deepEqual(hits, []);
});
```

Run: `cd v2 && node --test tests/banned.test.mjs` → FAIL (`normalizeForBan` not exported).

- [ ] **Step 3: Implement hashing**

`v2/scripts/lib/banned.mjs`:

```js
// Flags unreleased or excluded names by comparing hashed word n-grams, so the terms never appear in source.
import { createHash } from "node:crypto";
import { BANNED_HASHES } from "./banned-hashes.mjs";

const MAX_N = 3;

export function normalizeForBan(text) {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export const hashTerm = (normalized) => createHash("sha256").update(normalized).digest("hex");

export function findBanned(text) {
  const tokens = normalizeForBan(text).split(" ").filter(Boolean);
  for (let n = 1; n <= MAX_N; n++) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const gram = tokens.slice(i, i + n).join(" ");
      if (BANNED_HASHES.has(hashTerm(gram))) return gram;
    }
  }
  return null;
}
```

`v2/scripts/hash-banned-terms.mjs`:

```js
#!/usr/bin/env node
// Regenerates scripts/lib/banned-hashes.mjs from the gitignored .banned-terms.local list.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeForBan, hashTerm } from "./lib/banned.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const terms = readFileSync(join(root, ".banned-terms.local"), "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const hashes = [...new Set(terms.map((t) => hashTerm(normalizeForBan(t))))].sort();
const body = `// Generated by scripts/hash-banned-terms.mjs; SHA-256 of normalized banned n-grams.\nexport const BANNED_HASHES = new Set(${JSON.stringify(hashes, null, 2)});\n`;
writeFileSync(join(root, "scripts/lib/banned-hashes.mjs"), body);
console.log(`Wrote ${hashes.length} hashes.`);
```

Bootstrap: create `banned-hashes.mjs` with `export const BANNED_HASHES = new Set([]);`, then run `node scripts/hash-banned-terms.mjs`. Add npm script `"banned:hash": "node scripts/hash-banned-terms.mjs"`.

Run: `npm test` → all PASS (content tests still pass because `findBanned` keeps its contract). If `content.test.mjs` scans produce new hits (the n-gram matcher is broader than the regex), report them; do not edit content.

- [ ] **Step 4: History check script**

`v2/scripts/check-history.mjs`:

```js
#!/usr/bin/env node
// Fails when any commit between the base ref and HEAD adds or removes text containing a banned term.
import { execFileSync } from "node:child_process";
import { findBanned } from "./lib/banned.mjs";

const base = process.argv[2] || "main";
const log = execFileSync("git", ["log", "-p", "--format=COMMIT %h %s", `${base}..HEAD`], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const hits = [];
let commit = "";
for (const line of log.split("\n")) {
  if (line.startsWith("COMMIT ")) { commit = line.slice(7); const h = findBanned(line); if (h) hits.push(`${commit}: message`); continue; }
  if ((line.startsWith("+") || line.startsWith("-")) && !line.startsWith("+++") && !line.startsWith("---")) {
    if (findBanned(line)) hits.push(`${commit}: ${line.slice(0, 80).replace(/\S{6,}/g, (w) => (findBanned(w) ? "[redacted]" : w))}`);
  }
}
if (hits.length) { console.error(`${hits.length} banned-term lines in history:`); for (const h of hits.slice(0, 50)) console.error("  " + h); process.exit(1); }
console.log(`History clean (${base}..HEAD).`);
```

Add npm script `"check:history": "node scripts/check-history.mjs"`. Run it now: expected FAIL (earlier commits contain names). That failure is the pre-push gate; it is resolved at merge time by rewriting the branch (not in this task).

- [ ] **Step 5: Redact docs**

In the spec and the Phase 1 plan, replace every brand/product/excluded name with neutral wording: brand → "the lamp brand", desk-lamp product name → "the desk lamp", wall-lamp product name → "the wall lamp", brand folder paths → `$BRAND/…`, the startup → "the startup". Keep meaning. Verify: `node -e 'import("./v2/scripts/lib/banned.mjs").then(({findBanned})=>{const fs=require("fs");for(const f of process.argv.slice(1)){const h=findBanned(fs.readFileSync(f,"utf8"));console.log(f,h?"HIT":"clean")}})' docs/superpowers/specs/2026-09-25-site-refresh-design.md docs/superpowers/plans/*.md` → all clean. This plan file is written without names and must stay clean.

- [ ] **Step 6: Commit**

```bash
git add v2/scripts/lib/banned.mjs v2/scripts/lib/banned-hashes.mjs v2/scripts/hash-banned-terms.mjs v2/scripts/check-history.mjs v2/tests/banned.test.mjs v2/package.json v2/.gitignore docs/superpowers/specs/2026-09-25-site-refresh-design.md docs/superpowers/plans/2026-09-25-phase1-content-foundation.md
git commit -m "Hash banned terms and redact unreleased names from tracked docs"
```

---

### Task 1: Asset manifest and checker

**Files:** Create `v2/scripts/lib/asset-checks.mjs`, `v2/scripts/check-assets.mjs`, `v2/tests/asset-checks.test.mjs`, `v2/assets.manifest.json`; modify `v2/package.json`.

**Interfaces:**
- Produces: `SLOTS = { cover: 16/10, tall: 4/5, tile: 1, wide: 3/2 }`; `checkRatio({width,height}, slot) -> string|null`; `checkMargins(alphaBBox, {width,height}, {minMargin=0.08, fillMin=0.70, fillMax=0.80, coverTop=false}) -> string[]`; `alphaBBox(sharpInstance) -> {left,top,right,bottom}|null`. Manifest entries: `{ "file": "desk-lamp/cover.webp", "slot": "cover", "subjectMask": "desk-lamp/cover.mask.png" | null }`.

- [ ] **Step 1: Failing tests** (`v2/tests/asset-checks.test.mjs`)

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { SLOTS, checkRatio, checkMargins, alphaBBox } from "../scripts/lib/asset-checks.mjs";

test("checkRatio accepts exact slot ratios within 0.5%", () => {
  assert.equal(checkRatio({ width: 1600, height: 1000 }, "cover"), null);
  assert.equal(checkRatio({ width: 1600, height: 2000 }, "tall"), null);
  assert.match(checkRatio({ width: 1600, height: 900 }, "cover"), /ratio/);
});

test("checkRatio rejects unknown slots", () => {
  assert.match(checkRatio({ width: 10, height: 10 }, "square"), /slot/);
});

test("checkMargins flags a subject touching the edge and passes a centered one", () => {
  const size = { width: 1000, height: 1000 };
  assert.deepEqual(checkMargins({ left: 125, top: 110, right: 875, bottom: 870 }, size), []);
  assert.ok(checkMargins({ left: 0, top: 110, right: 875, bottom: 870 }, size).some((e) => /left margin/.test(e)));
});

test("checkMargins enforces fill range and cover top placement", () => {
  const size = { width: 1600, height: 1000 };
  assert.ok(checkMargins({ left: 500, top: 400, right: 1100, bottom: 600 }, size).some((e) => /fill/.test(e)));
  assert.ok(checkMargins({ left: 500, top: 250, right: 1100, bottom: 920 }, size, { coverTop: true, fillMin: 0.5 }).some((e) => /upper 65%/.test(e)));
});

test("alphaBBox finds opaque pixels in an RGBA image", async () => {
  const img = sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: { create: { width: 20, height: 30, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }, left: 40, top: 10 }]);
  const buf = await img.png().toBuffer();
  assert.deepEqual(await alphaBBox(sharp(buf)), { left: 40, top: 10, right: 60, bottom: 40 });
});

test("SLOTS has the four slot ratios", () => {
  assert.deepEqual(Object.keys(SLOTS).sort(), ["cover", "tall", "tile", "wide"]);
});
```

Run → FAIL (module missing).

- [ ] **Step 2: Implement** (`v2/scripts/lib/asset-checks.mjs`)

```js
// Framing checks for site assets: slot aspect ratios and subject margins from an alpha mask.
export const SLOTS = { cover: 16 / 10, tall: 4 / 5, tile: 1, wide: 3 / 2 };

export function checkRatio({ width, height }, slot) {
  const target = SLOTS[slot];
  if (!target) return `unknown slot "${slot}"`;
  const actual = width / height;
  return Math.abs(actual - target) / target <= 0.005 ? null : `ratio ${actual.toFixed(3)} != ${slot} ${target.toFixed(3)}`;
}

export function checkMargins(bbox, { width, height }, { minMargin = 0.08, fillMin = 0.7, fillMax = 0.8, coverTop = false } = {}) {
  const errs = [];
  const m = { left: bbox.left / width, right: (width - bbox.right) / width, top: bbox.top / height, bottom: (height - bbox.bottom) / height };
  for (const [side, v] of Object.entries(m)) if (v < minMargin) errs.push(`${side} margin ${(v * 100).toFixed(1)}% < ${minMargin * 100}%`);
  const fill = (bbox.bottom - bbox.top) / height;
  if (fill < fillMin || fill > fillMax) errs.push(`fill ${(fill * 100).toFixed(1)}% outside ${fillMin * 100}-${fillMax * 100}%`);
  if (coverTop && bbox.bottom / height > 0.65 + 1e-9) errs.push(`subject bottom at ${((bbox.bottom / height) * 100).toFixed(1)}%, not in upper 65%`);
  return errs;
}

export async function alphaBBox(img) {
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y;
      }
    }
  }
  return right < 0 ? null : { left, top, right: right + 1, bottom: bottom + 1 };
}
```

Note: `coverTop` checks subject bottom ≤ 65% only when the manifest entry sets `"coverTop": true`; product covers use a lower fill (`fillMin 0.5`) because the subject must fit in the upper 65%. Manifest entries may override `fillMin`/`fillMax`.

- [ ] **Step 3: CLI** (`v2/scripts/check-assets.mjs`)

```js
#!/usr/bin/env node
// Validates every manifest asset: file exists, slot ratio, minimum width, and subject margins when a mask is given.
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { checkRatio, checkMargins, alphaBBox } from "./lib/asset-checks.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const art = join(root, "public/artifacts");
const MIN_WIDTH = { cover: 1600, tall: 1200, tile: 1000, wide: 1600 };
const MAX_BYTES = { ".webp": 600_000, ".webm": 3_000_000, ".mp4": 3_000_000, ".glb": 6_000_000 };
const manifest = JSON.parse(readFileSync(join(root, "assets.manifest.json"), "utf8"));
let failed = 0;
for (const e of manifest) {
  const p = join(art, e.file);
  const errs = [];
  if (!existsSync(p)) errs.push("missing");
  else {
    const ext = e.file.slice(e.file.lastIndexOf("."));
    if (MAX_BYTES[ext] && statSync(p).size > MAX_BYTES[ext]) errs.push(`size ${statSync(p).size} > ${MAX_BYTES[ext]}`);
    if (e.slot) {
      const meta = await sharp(p).metadata();
      const r = checkRatio(meta, e.slot); if (r) errs.push(r);
      if (meta.width < MIN_WIDTH[e.slot]) errs.push(`width ${meta.width} < ${MIN_WIDTH[e.slot]}`);
      if (e.subjectMask) {
        const bb = await alphaBBox(sharp(join(art, e.subjectMask)));
        if (!bb) errs.push("mask empty"); else errs.push(...checkMargins(bb, meta, { coverTop: e.coverTop, fillMin: e.fillMin, fillMax: e.fillMax }));
      }
    }
  }
  console.log(`${errs.length ? "FAIL" : "ok  "} ${e.file}${errs.length ? " — " + errs.join("; ") : ""}`);
  failed += errs.length ? 1 : 0;
}
process.exit(failed ? 1 : 0);
```

Masks (`*.mask.png`, RGBA, same size as the render, subject opaque) are written by the render scripts and live next to the asset; they are excluded from the page but committed so the check is reproducible. Add `"assets:check": "node scripts/check-assets.mjs"`. Start `assets.manifest.json` as `[]`.

- [ ] **Step 4: Run tests, commit**

`cd v2 && npm test` → PASS; `npm run assets:check` → exit 0 (empty manifest).
`git add v2/scripts/lib/asset-checks.mjs v2/scripts/check-assets.mjs v2/tests/asset-checks.test.mjs v2/assets.manifest.json v2/package.json && git commit -m "Add asset manifest and framing checker"`

---

### Task 2: Grinder CAD export from Fusion

**Files:** outside repo: `$BRAND/brand/site-renders/grinder/` (exports); scratch scripts in the session scratchpad.

- [ ] **Step 1: Locate the design.** With Fusion idle (`fusion_mcp_read activeCommand` returns `SelectCommand`; if a modal or stuck command blocks it, stop and report BLOCKED so the controller can ask Rodolfo to press Esc in Fusion), run a read-only script that lists `app.data.dataProjects` and, per project, top-level `rootFolder.dataFiles` names only (no recursion first — recursion over every project is slow). Match names containing `grind`, `coffee`, `hopper`, `burr`, `auger`; recurse only into projects whose name matches or whose top level has no match (depth ≤ 2). Write results to JSON; report candidates with version numbers.
- [ ] **Step 2: Open and inspect.** Open the best candidate (`app.documents.open(dataFile, True)`), list top-level occurrences with visibility, body counts, and appearance names; save a Fusion viewport screenshot (iso, 1600×1000) to the exports folder so the controller can confirm it is the right model. Report the occurrence list. Controller confirms before Step 3.
- [ ] **Step 3: Export.** Export the assembly as USDZ (`exportManager.createUSDZExportOptions` if available, else OBJ with materials, else STEP) and as per-component STL with transforms (reuse the brand folder's `s_export_cad.py` approach) to `$BRAND/brand/site-renders/grinder/export/`. Also export two presentation states for the 3D viewers: (a) assembled, (b) exploded or hopper-off view if the design has one; otherwise (b) is a second angle of the same model chosen in Task 4. Close the document without saving.
- [ ] **Step 4: Report** file list and sizes. No commit (outside repo).

### Task 3: Wall lamp renders (reflexo)

**Files:** outside repo: `$BRAND/brand/site-renders/wall_lamp_site.py`; repo: `v2/public/artifacts/wall-lamp/{cover.webp,hero.webp,pose-left.webp,pose-center.webp,pose-right.webp}` + masks; manifest entries.

- [ ] **Step 1:** Write `wall_lamp_site.py` that `exec`s the brand folder's head-study script setup (materials, wall, arm, `reflexo` head, studio lights) but replaces `frame()` and the render loop with site framing: cover 1600×1000 (arm at the hero angle, lens chosen so the whole lamp including all plates fits in the upper 65% with ≥8% side margins), hero 1600×2000, and three 1200×1200 tiles at the left/center/right poses. It also renders a matching subject mask per image (holdout pass: wall hidden, film transparent, lamp and plates only) to `*.mask.png`.
- [ ] **Step 2:** Test render at 32 samples, 400 px wide; controller views the images for framing before full renders.
- [ ] **Step 3:** Full renders (256 samples, target sizes), convert PNG → webp q86 with sharp, write to `v2/public/artifacts/wall-lamp/`, add manifest entries (`cover` with `coverTop: true, fillMin: 0.5`; `tall`; three `tile`), run `npm run assets:check` → all ok.
- [ ] **Step 4:** Commit assets + manifest: `git commit -m "Add wall lamp renders"`.

### Task 4: Grinder renders and 3D models

**Files:** outside repo `$BRAND/brand/site-renders/grinder_scene.py`; repo `v2/public/artifacts/grinder/{cover.webp,hero.webp,angle-1.webp,angle-2.webp,angle-3.webp,doser.glb,wide.glb}` + masks; manifest.

- [ ] **Step 1:** `grinder_scene.py` imports the Task 2 export into the desk-lamp studio scene (reuse its lights, floor, world, 85 mm camera, Filmic), assigns materials by Fusion appearance name (metal → brushed/anodized aluminium, printed parts → matte plastic in their Fusion colors, screen → emissive dark glass with a dim UI glow), and frames cover/hero/three 1:1 angles per the Global Constraints, writing masks.
- [ ] **Step 2:** Test renders (32 samples, small) → controller framing review → full renders (256 samples) → webp → manifest → `assets:check`.
- [ ] **Step 3:** GLBs: from the imported scene, export `doser.glb` (doser config) and `wide.glb` (wide-funnel config) with Draco (level 6), baked materials, Y-up, applied transforms; each ≤ 6 MB. Load each in `model-viewer` via the dev server to confirm materials and orientation (controller).
- [ ] **Step 4:** Commit: `git commit -m "Add grinder renders and 3D models"`.

### Task 5: Desk lamp cover and media

**Files:** outside repo `$BRAND/brand/site-renders/desk_lamp_cover.py`; repo `v2/public/artifacts/desk-lamp/{cover.webp,hero.webp,paper.webp,lift.webm,lift.mp4}` + masks; manifest.

- [ ] **Step 1:** `desk_lamp_cover.py` opens the desk-lamp scene `.blend`, sets 1600×1000 with the lamp in the upper 65%, renders cover + mask (256 samples).
- [ ] **Step 2:** Convert existing 2000×2500 hero-up → `hero.webp` (tall) and paper-up → `paper.webp` (tall), resized to 1600×2000 (same ratio, no crop). Masks from the cutout-up render (resized identically).
- [ ] **Step 3:** Re-encode the lift animation (1080×1350, 4:5) to `lift.webm` (VP9, CRF 34) and `lift.mp4` (H.264, CRF 26, `+faststart`), each ≤ 3 MB, no audio.
- [ ] **Step 4:** Manifest + `assets:check`; commit `"Add desk lamp cover, stills, and lift video"`. Existing `lamp_closed.glb`/`lamp_open.glb` stay where they are.

### Task 6: Diagram components

**Files:** Create `v2/src/components/project/Diagram.astro` and `v2/src/components/diagrams/{GrinderProcesses,GrinderTouchStates,DeskLampLift,DeskLampElectronics,WallLampDrive,TobiasSimToReal,TidyNetPipeline,PruningSweep,RaiBudgetArchitecture,RaiClimbingSync,ChatRag}.astro`.

- [ ] **Step 1:** `Diagram.astro` props `{ caption: string; label: string }`, renders `<figure class="not-prose my-8 rounded-xl border bg-(--color-card) p-4 md:p-6">` with a slot and `<figcaption>` in muted mono text; SVG children use `currentColor` for strokes/text and `var(--color-muted)` / `var(--color-card)` fills so both themes work; `role="img"` + `aria-label={label}` on the SVG.
- [ ] **Step 2:** One component per diagram, each a single inline `<svg viewBox>` (width 100%, readable at 360 px wide: min font 11px at that width, max 7 nodes per row, stack vertically on narrow viewBoxes via a second `<svg>` shown under `md:hidden`). Content (facts from the knowledge files; no brand names, no angles for the wall lamp, no PCB detail):
  - GrinderProcesses: `motor_control.py` (UI + touch state machine) spawns `motor_only.py` (stepper, DRV8711) and `servo_only.py` (auger doser); LCD ↔ shared SPI bus handoff; teardown-both-on-crash arrow.
  - GrinderTouchStates: idle → hold to arm → grinding (ramp 1.5 s) → doser start after 3 s → stop; swipe switches speed/feed screens; standby after 10 min.
  - DeskLampLift: brushless gimbal motor → lead screw → carriage on two rods → lit core rises; knob with encoder → target height = brightness.
  - DeskLampElectronics: 24 V in → motor driver → BLDC; buck → ESP32-S3 → LED strip (warm/cool); encoder + knob → ESP32; Matter over WiFi; signed OTA.
  - WallLampDrive: gimbal motor → printed planetary (early) → printed cycloidal reduction (current) → arm; knock sensed by motor encoder → next held position; driver sleeps, friction holds.
  - TobiasSimToReal: PyBullet + SB3 (SAC vs DQN) → best trajectories as JSON → Pi replay on 8 LX-16A servos; live SAC policy path with IMU feedback.
  - TidyNetPipeline: messy scene image → CFG diffusion model → tidy target layout → YOLO-OBB detection on both → matching → WidowX 200 pick-and-place (ROS2).
  - PruningSweep: 2×2×2 grid (dataset Fashion-MNIST/CIFAR-10 × pruning method × schedule) as a small cube/table graphic; finding: 80–95% pruned helped test performance.
  - RaiBudgetArchitecture: Flutter app (iOS/Android/macOS) ↔ Supabase (Postgres + RLS, realtime, edge functions, pg_cron) ↔ Plaid; scheduled LLM analysis routine → report back.
  - RaiClimbingSync: app (single versioned document) ↔ Supabase with revision check + conflict snapshot; Tension Board import; LLM analysis → recommendations with one-tap actions → validator.
  - ChatRag: question → Cohere embed → Pinecone (topK 20) → rerank → top chunks → Command A with documents → answer; indexer: knowledge/*.md → chunks → embed → namespace.
- [ ] **Step 3:** Create a temporary preview page `v2/src/pages/diagrams-preview.astro` rendering every diagram inside `BaseLayout`. Controller screenshots it at 1440 px and 390 px in light and dark. Delete the page before committing; it is never committed.
- [ ] **Step 4:** `npm run build` clean; commit components (not the preview page): `"Add project diagram components"`.

### Task 7: RaiClimbing screenshots (Android, fake data)

**Files:** scratch: `raiclimbing-fake-export.json`; repo: `v2/public/artifacts/raiapps/climbing-{today,plan,charts,report}.webp`.

- [ ] **Step 1:** Read the app's export/import schema from its source (`lib/` export model, versioned). Write a fake export: 8 weeks of plausible training (hangboard, limit bouldering, strength), fake Tension Board climbs V3–V7, a couple of mild pain check-ins, a fake analysis report with 3 recommendations. Validate it with the app's own import validator via a unit test run in a scratch copy if one exists; otherwise by reading the validator code.
- [ ] **Step 2:** Boot `rai_test` headless (`emulator -avd rai_test -no-window -no-audio -no-boot-anim &`, PID tracked), `flutter run --release -d emulator-5554` from a scratch worktree of the app (not the user's checkout), complete onboarding with fake body metrics, import the fake JSON via Settings.
- [ ] **Step 3:** Capture 4 screens with `adb exec-out screencap -p` at native resolution (portrait phone ≈ 9:19.5). These go inside `DeviceFrame`, so their slot is the phone frame, not a site ratio; record them in the manifest without `slot` (existence + size checks only).
- [ ] **Step 4:** Kill emulator and flutter processes (`adb emu kill`; verify `pgrep -fl "qemu|emulator|flutter"` empty). Convert to webp, commit `"Add RaiClimbing fake-data screenshots"`.

### Task 8: RaiBudget screenshots (Flutter, fake data)

**Files:** scratch worktree of RaiBudget; repo `v2/public/artifacts/raiapps/budget-{dashboard,transactions,budgets,analysis}.webp` (phone) and `budget-dashboard-mac.webp` (macOS window).

- [ ] **Step 1:** In a scratch `git worktree` of RaiBudget (never the user's checkout), add a screenshot harness `integration_test/screenshots_test.dart` or golden test that pumps each screen with Riverpod provider overrides (pattern from `app/test/dashboard_screen_test.dart`) and fake data: two users "Rodolfo" and "Alex", ~120 transactions across 8 categories for 2 months, budgets with a mix of under/over, 2 goals, a small investments portfolio, a fake analysis report. Bypass PIN/unlock via overrides only inside the harness.
- [ ] **Step 2:** Render phone-size (1170×2532 logical ×3) and a macOS window size (1440×900) PNGs via `flutter test --update-goldens` with real fonts loaded (`loadAppFonts` equivalent) so text is not Ahem boxes.
- [ ] **Step 3:** Controller reviews images for any real-looking data; convert to webp, manifest, commit `"Add RaiBudget fake-data screenshots"`. Remove the scratch worktree.

### Task 9: RaiUsage and RaiDrive visuals

**Files:** repo `v2/public/artifacts/raiapps/{usage-popover.webp,usage-icon.webp,drive-icon.webp}`.

- [ ] **Step 1:** RaiUsage: build and run the app's SwiftUI preview or a tiny snapshot test using `RaiUsageTests/Fixtures` to render `PopoverView` to PNG (`ImageRenderer` in a test target in a scratch clone), 2× scale.
- [ ] **Step 2:** Icons: export 512 px webp from each app's `AppIcon` set.
- [ ] **Step 3:** Manifest (no slot), commit `"Add RaiUsage and RaiDrive visuals"`.

### Task 10: Phase verification

- [ ] `npm test`, `npm run assets:check`, `npm run build` all pass; `npm run check:history` expected to fail until the pre-push rewrite (report count only).
- [ ] Sizes: `du -sh v2/public/artifacts/{desk-lamp,wall-lamp,grinder,raiapps}`; total new assets ≤ 40 MB.
- [ ] No leftover processes: `pgrep -fl "Blender|fz.py|qemu|emulator|flutter|astro dev"` empty.
- [ ] Controller visual pass over every new asset.
