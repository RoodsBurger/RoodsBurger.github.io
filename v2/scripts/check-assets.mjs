#!/usr/bin/env node
// Validates every manifest asset: file exists, slot ratio, minimum width, subject margins and dimensions
// when a mask is given, and reports orphan files sitting under a tracked artifact directory unreferenced
// by the manifest.
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { checkRatio, checkMargins, alphaBBox } from "./lib/asset-checks.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const art = process.env.ASSETS_ROOT || join(root, "public/artifacts");
const masksRoot = process.env.MASKS_ROOT || join(root, "asset-masks");
const manifestPath = process.env.ASSETS_MANIFEST || join(root, "assets.manifest.json");
const MIN_WIDTH = { cover: 2560, tall: 2000, tile: 1600, wide: 2400 };
const MAX_BYTES = { ".webp": 600_000, ".webm": 3_000_000, ".mp4": 3_000_000, ".glb": 6_000_000, ".png": 1_500_000 };
const ORPHAN_DIRS = ["desk-lamp", "wall-lamp", "grinder", "raiapps"];
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
let failed = 0;

const extOf = (name) => name.slice(name.lastIndexOf("."));

for (const e of manifest) {
  const p = join(art, e.file);
  const errs = [];
  if (!existsSync(p)) errs.push("missing");
  else {
    try {
      const ext = extOf(e.file);
      if (MAX_BYTES[ext] && statSync(p).size > MAX_BYTES[ext]) errs.push(`size ${statSync(p).size} > ${MAX_BYTES[ext]}`);
      if (e.slot) {
        const meta = await sharp(p).metadata();
        const r = checkRatio(meta, e.slot); if (r) errs.push(r);
        if (meta.width < MIN_WIDTH[e.slot]) errs.push(`width ${meta.width} < ${MIN_WIDTH[e.slot]}`);
        if (e.subjectMask) {
          const maskPath = join(masksRoot, e.subjectMask);
          if (!existsSync(maskPath)) errs.push("mask missing");
          else {
            const maskExt = extOf(e.subjectMask);
            const maskSize = statSync(maskPath).size;
            if (MAX_BYTES[maskExt] && maskSize > MAX_BYTES[maskExt]) errs.push(`mask size ${maskSize} > ${MAX_BYTES[maskExt]}`);
            const maskMeta = await sharp(maskPath).metadata();
            if (maskMeta.width !== meta.width || maskMeta.height !== meta.height) {
              errs.push(`mask dims ${maskMeta.width}x${maskMeta.height} != image ${meta.width}x${meta.height}`);
            }
            const bb = await alphaBBox(sharp(maskPath));
            if (!bb) errs.push("mask empty"); else errs.push(...checkMargins(bb, meta, { coverTop: e.coverTop, fillMin: e.fillMin, fillMax: e.fillMax }));
          }
        }
      }
    } catch (err) {
      errs.push(`error: ${String(err).split('\n')[0]}`);
    }
  }
  console.log(`${errs.length ? "FAIL" : "ok  "} ${e.file}${errs.length ? " — " + errs.join("; ") : ""}`);
  failed += errs.length ? 1 : 0;
}

const manifestFiles = new Set(manifest.map((e) => e.file));
for (const dir of ORPHAN_DIRS) {
  const dirPath = join(art, dir);
  if (!existsSync(dirPath)) continue;
  for (const f of readdirSync(dirPath)) {
    const rel = `${dir}/${f}`;
    if (!manifestFiles.has(rel)) {
      console.log(`FAIL orphan ${rel} — not referenced in manifest`);
      failed++;
    }
  }
}

process.exit(failed ? 1 : 0);
