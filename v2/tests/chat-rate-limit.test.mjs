import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryStore, checkLimit } from "../src/lib/chat/rate-limit.ts";

test("allows up to the limit then blocks the next request", async () => {
  const store = memoryStore();
  const opts = { limit: 20, windowMs: 10 * 60 * 1000, now: 1000 };
  for (let i = 0; i < 20; i++) {
    const result = await checkLimit(store, "ip:1.2.3.4:1000", opts);
    assert.equal(result.allowed, true, `request ${i + 1} should be allowed`);
  }
  const blocked = await checkLimit(store, "ip:1.2.3.4:1000", opts);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
});

test("resets after the window elapses", async () => {
  const store = memoryStore();
  const key = "ip:1.2.3.4:1000";
  for (let i = 0; i < 20; i++) {
    await checkLimit(store, key, { limit: 20, windowMs: 1000, now: 0 });
  }
  const stillBlocked = await checkLimit(store, key, { limit: 20, windowMs: 1000, now: 500 });
  assert.equal(stillBlocked.allowed, false);
  const afterWindow = await checkLimit(store, key, { limit: 20, windowMs: 1000, now: 1001 });
  assert.equal(afterWindow.allowed, true);
  assert.equal(afterWindow.remaining, 19);
});

test("a daily key is tracked independently from a per-window key", async () => {
  const store = memoryStore();
  const opts = { limit: 20, windowMs: 10 * 60 * 1000, now: 0 };
  for (let i = 0; i < 20; i++) {
    await checkLimit(store, "ip:1.2.3.4:0", opts);
  }
  const perWindowBlocked = await checkLimit(store, "ip:1.2.3.4:0", opts);
  assert.equal(perWindowBlocked.allowed, false);

  const dailyOpts = { limit: 1500, windowMs: 24 * 60 * 60 * 1000, now: 0 };
  const daily = await checkLimit(store, "day:2026-09-26", dailyOpts);
  assert.equal(daily.allowed, true);
  assert.equal(daily.remaining, 1499);
});

test("the window boundary: resetAt - 1 is still blocked, resetAt itself is allowed again", async () => {
  const store = memoryStore();
  const key = "k";
  let resetAt;
  for (let i = 0; i < 5; i++) {
    ({ resetAt } = await checkLimit(store, key, { limit: 5, windowMs: 1000, now: 0 }));
  }
  const justBefore = await checkLimit(store, key, { limit: 5, windowMs: 1000, now: resetAt - 1 });
  assert.equal(justBefore.allowed, false);
  const atReset = await checkLimit(store, key, { limit: 5, windowMs: 1000, now: resetAt });
  assert.equal(atReset.allowed, true);
});

test("remaining decrements by one on each allowed request", async () => {
  const store = memoryStore();
  const opts = { limit: 3, windowMs: 1000, now: 0 };
  const first = await checkLimit(store, "k", opts);
  const second = await checkLimit(store, "k", opts);
  assert.equal(first.remaining, 2);
  assert.equal(second.remaining, 1);
});
