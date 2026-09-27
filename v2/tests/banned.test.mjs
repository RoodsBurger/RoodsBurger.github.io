import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findBanned, normalizeForBan, hashTerm, ngrams, LOCAL_KEY } from "../scripts/lib/banned.mjs";
import { BANNED_HASHES } from "../scripts/lib/banned-hashes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const localList = join(root, ".banned-terms.local");
const terms = existsSync(localList) ? readFileSync(localList, "utf8").split("\n").map((s) => s.trim()).filter(Boolean) : [];
const hasRealTerms = terms.length > 0 && Boolean(LOCAL_KEY);

test("every locally listed term is flagged, including accent, apostrophe, and NBSP variants", { skip: !hasRealTerms && "no .banned-terms.local or .banned-key.local" }, () => {
  for (const t of terms) {
    const variants = [t, t.toUpperCase(), `x ${t} y`, t.replace(/ /g, "\u00a0"), t.replace(/'/g, "\u2019"), t.normalize("NFD")];
    for (const v of variants) assert.ok(findBanned(v), JSON.stringify(v));
  }
});

test("ordinary words are not flagged", () => {
  for (const t of ["nucleotide", "hasten", "admiral", "mirage", "a nuclear option", "hello world", "dean list"]) {
    assert.equal(findBanned(t), null, t);
  }
});

test("normalizeForBan strips accents, apostrophes and punctuation to single spaces", () => {
  assert.equal(normalizeForBan("Caf\u00e9\u2019s  AI-Image x"), "cafes ai image x");
});

test("normalizeForBan splits camelCase and letter/digit boundaries before lowercasing", () => {
  assert.equal(normalizeForBan("ZorblaxLamp"), "zorblax lamp");
  assert.equal(normalizeForBan("zorblax2"), "zorblax 2");
  assert.equal(normalizeForBan("2zorblax"), "2 zorblax");
  assert.equal(normalizeForBan("MyZorblaxThing99"), "my zorblax thing 99");
});

test("banned.mjs source contains no plain-text terms", { skip: !hasRealTerms && "no .banned-terms.local or .banned-key.local" }, () => {
  const src = readFileSync(join(root, "scripts/lib/banned.mjs"), "utf8") + readFileSync(join(root, "scripts/lib/banned-hashes.mjs"), "utf8");
  for (const t of terms) assert.equal(normalizeForBan(src).includes(normalizeForBan(t)), false, "leaks a term");
});

test("knowledge files contain no banned terms", () => {
  const dir = join(root, "knowledge");
  if (!existsSync(dir)) return;
  const hits = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => [f, findBanned(readFileSync(join(dir, f), "utf8"))]).filter(([, h]) => h);
  assert.deepEqual(hits, []);
});

test("BANNED_HASHES is non-empty, so an empty hash file fails CI", () => {
  assert.ok(BANNED_HASHES.size > 0);
});

test("ngrams builds contiguous token windows of size n", () => {
  assert.deepEqual(ngrams(["a", "b", "c"], 1), ["a", "b", "c"]);
  assert.deepEqual(ngrams(["a", "b", "c"], 2), ["a b", "b c"]);
  assert.deepEqual(ngrams(["a", "b"], 3), []);
});

// A synthetic hash set and key exercise the matcher on a clean clone, where .banned-terms.local
// and .banned-key.local are absent and the tests above skip, by covering the same matching logic
// with made-up terms and a made-up key instead.
const SYNTHETIC_KEY = "aa".repeat(32);
const MADE_UP_TERMS = ["zorblax", "flim flam", "ai-test-term", "quux's list"];
const syntheticHashes = new Set(MADE_UP_TERMS.map((t) => hashTerm(normalizeForBan(t), SYNTHETIC_KEY)));

test("synthetic terms are flagged across case, accent, apostrophe, NBSP, hyphen/space, and sentence variants", () => {
  for (const t of MADE_UP_TERMS) {
    const variants = [
      t,
      t.toUpperCase(),
      t.normalize("NFD"),
      t.replace(/'/g, "\u2019"),
      t.replace(/ /g, "\u00a0"),
      t.replace(/-/g, " "),
      t.replace(/ /g, "-"),
      `an example of ${t} in a sentence`,
    ];
    for (const v of variants) assert.ok(findBanned(v, syntheticHashes, SYNTHETIC_KEY), JSON.stringify(v));
  }
});

test("synthetic terms do not flag near-miss words", () => {
  for (const t of ["zorblaxes", "flim", "flam flim"]) {
    assert.equal(findBanned(t, syntheticHashes, SYNTHETIC_KEY), null, t);
  }
});

test("synthetic terms split across camelCase and letter/digit boundaries are flagged", () => {
  const camelHashes = new Set([hashTerm(normalizeForBan("zorblax"), SYNTHETIC_KEY)]);
  for (const v of ["ZorblaxLamp", "zorblax2", "2zorblax", "MyZorblaxThing"]) {
    assert.ok(findBanned(v, camelHashes, SYNTHETIC_KEY), v);
  }
});

test("findBanned is inert (returns null) when no key is available, regardless of hashes", () => {
  assert.equal(findBanned("zorblax", syntheticHashes, null), null);
});
