import { test } from "node:test";
import assert from "node:assert/strict";
import { validateNamespace, pruneDecision } from "../scripts/lib/index-guards.mjs";

test("validateNamespace accepts v2-prefixed namespaces", () => {
  for (const ns of ["v2-20260925", "v2-staging", "v2-my_ns-1"]) {
    assert.equal(validateNamespace(ns), null, ns);
  }
});

test("validateNamespace refuses the empty, missing, or default namespace", () => {
  for (const ns of ["", undefined, "__default__"]) {
    assert.ok(validateNamespace(ns), String(ns));
  }
});

test("validateNamespace refuses namespaces without the v2- prefix", () => {
  for (const ns of ["prod", "V2-staging", "v2", "v2_staging"]) {
    assert.ok(validateNamespace(ns), ns);
  }
});

test("pruneDecision skips deletion and reports the count when --prune is absent", () => {
  const d = pruneDecision({ staleCount: 5, totalCount: 20, prune: false });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /5/);
});

test("pruneDecision deletes when stale is at or under half of the total", () => {
  const d = pruneDecision({ staleCount: 10, totalCount: 20, prune: true });
  assert.equal(d.action, "delete");
});

test("pruneDecision refuses when stale exceeds half of the total", () => {
  const d = pruneDecision({ staleCount: 11, totalCount: 20, prune: true });
  assert.equal(d.action, "refuse");
  assert.match(d.reason, /11/);
});

test("pruneDecision deletes zero stale records with nothing to refuse", () => {
  const d = pruneDecision({ staleCount: 0, totalCount: 0, prune: true });
  assert.equal(d.action, "delete");
});
