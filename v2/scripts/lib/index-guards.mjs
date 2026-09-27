// Pure guard functions for the indexing script's namespace and prune safety checks.

const NAMESPACE_RE = /^v2-[\w-]+$/;

// Returns an error message when ns is not a safe v2-* namespace, or null when it is fine.
export function validateNamespace(ns) {
  if (typeof ns !== "string" || !NAMESPACE_RE.test(ns)) {
    return `Refusing to use namespace ${JSON.stringify(ns)}; it must match ${NAMESPACE_RE}.`;
  }
  return null;
}

// Decides whether stale records should be left alone, deleted, or refused as too risky.
export function pruneDecision({ staleCount, totalCount, prune }) {
  if (!prune) {
    return {
      action: "skip",
      reason: `${staleCount} stale record(s) would be removed; re-run with --prune to delete them.`,
    };
  }
  if (staleCount > totalCount * 0.5) {
    return {
      action: "refuse",
      reason: `Refusing to prune ${staleCount} of ${totalCount} record(s) in the namespace (over 50%); investigate before re-running.`,
    };
  }
  return { action: "delete", reason: `Deleting ${staleCount} stale record(s).` };
}
