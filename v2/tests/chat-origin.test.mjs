import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedOrigin } from "../src/lib/chat/origin.ts";

test("allows the production origins", () => {
  assert.equal(isAllowedOrigin("https://rraimundo.me"), true);
  assert.equal(isAllowedOrigin("https://www.rraimundo.me"), true);
});

test("allows local dev origins", () => {
  assert.equal(isAllowedOrigin("http://localhost:4321"), true);
  assert.equal(isAllowedOrigin("http://localhost:8888"), true);
});

test("allows the current Netlify deploy URLs from env", () => {
  const env = { URL: "https://example.netlify.app", DEPLOY_PRIME_URL: "https://deploy-preview-1--example.netlify.app" };
  assert.equal(isAllowedOrigin("https://example.netlify.app", env), true);
  assert.equal(isAllowedOrigin("https://deploy-preview-1--example.netlify.app", env), true);
});

test("allows the function's own origin, as on deploy previews without deploy URL env vars", () => {
  const requestUrl = "https://deploy-preview-7--example.netlify.app/.netlify/functions/chat";
  assert.equal(isAllowedOrigin("https://deploy-preview-7--example.netlify.app", {}, requestUrl), true);
  assert.equal(isAllowedOrigin("https://evil.example.com", {}, requestUrl), false);
  assert.equal(isAllowedOrigin("https://deploy-preview-7--example.netlify.app", {}, "not a url"), false);
  assert.equal(isAllowedOrigin(null, {}, requestUrl), false);
});

test("blocks an unrelated origin", () => {
  assert.equal(isAllowedOrigin("https://evil.example.com"), false);
});

test("blocks a missing origin", () => {
  assert.equal(isAllowedOrigin(undefined), false);
  assert.equal(isAllowedOrigin(null), false);
  assert.equal(isAllowedOrigin(""), false);
});
