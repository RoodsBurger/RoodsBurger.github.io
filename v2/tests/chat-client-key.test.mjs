import { test } from "node:test";
import assert from "node:assert/strict";
import { ipBucket, clientKey } from "../src/lib/chat/client-key.ts";

test("ipBucket keeps IPv4 addresses and unwraps IPv4-mapped IPv6", () => {
  assert.equal(ipBucket("203.0.113.7"), "203.0.113.7");
  assert.equal(ipBucket("::ffff:203.0.113.7"), "203.0.113.7");
});

test("ipBucket groups IPv6 addresses by their /64 prefix", () => {
  assert.equal(ipBucket("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), "2001:db8:1:2::/64");
  assert.equal(ipBucket("2001:0DB8:0001:0002::1"), "2001:db8:1:2::/64");
  assert.equal(ipBucket("2001:db8::1"), "2001:db8:0:0::/64");
  assert.equal(ipBucket("fe80::1%en0"), "fe80:0:0:0::/64");
  assert.notEqual(ipBucket("2001:db8:1:2::1"), ipBucket("2001:db8:1:3::1"));
});

test("clientKey is 16 hex chars, shared within a /64, and salted", () => {
  const a = clientKey("2001:db8:1:2::1", "site");
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.equal(a, clientKey("2001:db8:1:2:ffff::9", "site"));
  assert.notEqual(a, clientKey("2001:db8:1:3::1", "site"));
  assert.notEqual(a, clientKey("2001:db8:1:2::1", "other"));
});
