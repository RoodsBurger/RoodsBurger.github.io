import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import os from "node:os";
import { checkHistory } from "../scripts/check-history.mjs";
import { hashTerm, normalizeForBan } from "../scripts/lib/banned.mjs";

// Synthetic key and hash set so this test never depends on the real, gitignored
// .banned-terms.local / .banned-key.local pair and never touches real banned text.
const KEY = "bb".repeat(32);
const TERM = "zorblaxcase";
const HASHES = new Set([hashTerm(normalizeForBan(TERM), KEY)]);

function git(cwd, ...args) {
  execFileSync("git", args, { cwd, encoding: "utf8" });
}

function setUpRepo() {
  const dir = mkdtempSync(join(os.tmpdir(), "check-history-"));
  git(dir, "init", "-q");
  git(dir, "config", "user.email", "t@t.com");
  git(dir, "config", "user.name", "t");
  writeFileSync(join(dir, "README.md"), "hello\n");
  git(dir, "add", ".");
  git(dir, "commit", "-q", "-m", "base commit");
  git(dir, "branch", "-q", "base-ref");
  return dir;
}

test("check-history: banned path with clean content is reported and redacted", () => {
  const dir = setUpRepo();
  try {
    writeFileSync(join(dir, `${TERM}-notes.txt`), "nothing interesting here\n");
    git(dir, "add", ".");
    git(dir, "commit", "-q", "-m", "add notes file");
    const hits = checkHistory("base-ref", { cwd: dir, hashes: HASHES, key: KEY });
    assert.ok(hits.some((h) => h.includes("[redacted path]") && h.includes("(path)")));
    for (const h of hits) assert.equal(h.toLowerCase().includes(TERM), false, h);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-history: accented banned path is reported and redacted", () => {
  const dir = setUpRepo();
  try {
    const accented = `café-${TERM}.txt`;
    writeFileSync(join(dir, accented), "still nothing interesting\n");
    git(dir, "add", ".");
    git(dir, "commit", "-q", "-m", "add accented file");
    const hits = checkHistory("base-ref", { cwd: dir, hashes: HASHES, key: KEY });
    assert.ok(hits.some((h) => h.includes("[redacted path]") && h.includes("(path)")));
    for (const h of hits) assert.equal(h.toLowerCase().includes(TERM), false, h);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-history: binary file with a banned name is reported and redacted", () => {
  const dir = setUpRepo();
  try {
    writeFileSync(join(dir, `${TERM}.bin`), Buffer.from([0, 1, 2, 0, 3, 255]));
    git(dir, "add", ".");
    git(dir, "commit", "-q", "-m", "add binary file");
    const hits = checkHistory("base-ref", { cwd: dir, hashes: HASHES, key: KEY });
    assert.ok(hits.some((h) => h.includes("[redacted path]") && h.includes("(path)")));
    for (const h of hits) assert.equal(h.toLowerCase().includes(TERM), false, h);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-history: commit message body hit is reported without the term", () => {
  const dir = setUpRepo();
  try {
    writeFileSync(join(dir, "plain.txt"), "ordinary content\n");
    git(dir, "add", ".");
    git(dir, "commit", "-q", "-m", `mentions ${TERM} in the body`);
    const hits = checkHistory("base-ref", { cwd: dir, hashes: HASHES, key: KEY });
    assert.ok(hits.some((h) => h.includes("(commit message)")));
    for (const h of hits) assert.equal(h.toLowerCase().includes(TERM), false, h);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-history: clean history reports no hits", () => {
  const dir = setUpRepo();
  try {
    writeFileSync(join(dir, "plain.txt"), "ordinary content, nothing banned\n");
    git(dir, "add", ".");
    git(dir, "commit", "-q", "-m", "an ordinary commit");
    const hits = checkHistory("base-ref", { cwd: dir, hashes: HASHES, key: KEY });
    assert.deepEqual(hits, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
