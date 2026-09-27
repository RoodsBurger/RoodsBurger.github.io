// Flags unreleased or excluded names by comparing HMAC-keyed hashed word n-grams, so the terms never
// appear in source and the hashes cannot be reversed by brute-forcing a public word list.
import { createHmac } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BANNED_HASHES } from "./banned-hashes.mjs";

export const MAX_N = 3;

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KEY_PATH = join(root, ".banned-key.local");
// Undefined in a fresh clone, since the key file is gitignored and local-only.
export const LOCAL_KEY = existsSync(KEY_PATH) ? readFileSync(KEY_PATH, "utf8").trim() : null;

export function normalizeForBan(text) {
  const spaced = text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([A-Za-z])/g, "$1 $2");
  return spaced.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export const hashTerm = (normalized, key) => createHmac("sha256", Buffer.from(key, "hex")).update(normalized).digest("hex");

export function ngrams(tokens, n) {
  const grams = [];
  for (let i = 0; i + n <= tokens.length; i++) grams.push(tokens.slice(i, i + n).join(" "));
  return grams;
}

export function findBanned(text, hashes = BANNED_HASHES, key = LOCAL_KEY) {
  if (!key) return null;
  const tokens = normalizeForBan(text).split(" ").filter(Boolean);
  for (let n = 1; n <= MAX_N; n++) {
    for (const gram of ngrams(tokens, n)) {
      if (hashes.has(hashTerm(gram, key))) return gram;
    }
  }
  return null;
}
