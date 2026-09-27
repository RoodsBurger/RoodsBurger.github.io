import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import os from "node:os";
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

test("CLI reports valid, corrupt, missing-mask, mismatched-mask, oversized-mask, and orphan entries correctly", async () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const tmpDir = mkdtempSync(join(os.tmpdir(), "assets-"));
  try {
    const artDir = join(tmpDir, "art");
    const masksDir = join(tmpDir, "masks");
    mkdirSync(join(artDir, "grinder"), { recursive: true });
    mkdirSync(join(masksDir, "grinder"), { recursive: true });

    const validBuf = await sharp({ create: { width: 2560, height: 1600, channels: 3, background: { r: 255, g: 255, b: 255 } } }).webp().toBuffer();
    writeFileSync(join(artDir, "valid.webp"), validBuf);
    writeFileSync(join(artDir, "corrupt.webp"), "not an image");
    writeFileSync(join(artDir, "missing-mask.webp"), validBuf);

    // A mask whose pixel dimensions don't match its image.
    const mismatchImg = await sharp({ create: { width: 1600, height: 1600, channels: 3, background: { r: 255, g: 255, b: 255 } } }).webp().toBuffer();
    writeFileSync(join(artDir, "grinder", "mismatch.webp"), mismatchImg);
    const wrongSizeMask = await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: { create: { width: 40, height: 40, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }, left: 30, top: 30 }])
      .png()
      .toBuffer();
    writeFileSync(join(masksDir, "grinder", "mismatch.mask.png"), wrongSizeMask);

    // A mask that matches its image's dimensions but exceeds the .png size cap.
    const oversizedImg = await sharp({ create: { width: 1600, height: 1600, channels: 3, background: { r: 255, g: 255, b: 255 } } }).webp().toBuffer();
    writeFileSync(join(artDir, "grinder", "oversized.webp"), oversizedImg);
    const noise = randomBytes(1600 * 1600 * 4);
    const oversizedMask = await sharp(noise, { raw: { width: 1600, height: 1600, channels: 4 } }).png({ compressionLevel: 0 }).toBuffer();
    writeFileSync(join(masksDir, "grinder", "oversized.mask.png"), oversizedMask);

    // A file under a tracked artifact dir that the manifest never mentions.
    writeFileSync(join(artDir, "grinder", "orphan.webp"), validBuf);

    const manifest = [
      { file: "valid.webp", slot: "cover" },
      { file: "corrupt.webp", slot: "cover" },
      { file: "missing-mask.webp", slot: "cover", subjectMask: "missing.mask.png" },
      { file: "grinder/mismatch.webp", slot: "tile", subjectMask: "grinder/mismatch.mask.png" },
      { file: "grinder/oversized.webp", slot: "tile", subjectMask: "grinder/oversized.mask.png" }
    ];
    const manifestPath = join(tmpDir, "manifest.json");
    writeFileSync(manifestPath, JSON.stringify(manifest));
    let output = "";
    let exitCode = 0;
    try {
      execFileSync("node", ["scripts/check-assets.mjs"], {
        env: { ...process.env, ASSETS_MANIFEST: manifestPath, ASSETS_ROOT: artDir, MASKS_ROOT: masksDir },
        cwd: root,
        encoding: "utf8"
      });
    } catch (err) {
      output = err.stdout;
      exitCode = err.status;
    }
    assert.equal(exitCode, 1, "exit code should be 1");
    assert.match(output, /ok\s+valid\.webp/, "should have ok line for valid file");
    assert.match(output, /FAIL.*corrupt\.webp.*error:/, "should have FAIL with error: for corrupt file");
    assert.match(output, /FAIL.*missing-mask\.webp.*mask missing/, "should have FAIL with mask missing");
    assert.match(output, /FAIL.*grinder\/mismatch\.webp.*mask dims/, "should flag mismatched mask dimensions");
    assert.match(output, /FAIL.*grinder\/oversized\.webp.*mask size/, "should flag an oversized mask");
    assert.match(output, /FAIL orphan grinder\/orphan\.webp/, "should report the orphan file");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
