import { createHash } from "node:crypto";

// Normalizes a client IP to its rate-limit bucket: IPv4 as-is (including IPv4-mapped IPv6), IPv6 by its /64 prefix.
export function ipBucket(ip: string): string {
  const value = ip.trim().toLowerCase().replace(/%.*$/, "");
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
  if (mapped) return mapped[1];
  if (!value.includes(":")) return value;

  const hasGap = value.includes("::");
  const [headPart, tailPart] = hasGap ? value.split("::", 2) : [value, ""];
  const head = headPart ? headPart.split(":") : [];
  const tail = tailPart ? tailPart.split(":") : [];
  // An embedded dotted IPv4 suffix occupies two 16-bit groups.
  const tailGroups = tail.reduce((n, g) => n + (g.includes(".") ? 2 : 1), 0);
  const fill = hasGap ? new Array<string>(Math.max(0, 8 - head.length - tailGroups)).fill("0") : [];
  const groups = [...head, ...fill, ...tail];
  const prefix = groups.slice(0, 4).map((g) => (parseInt(g, 16) || 0).toString(16));
  while (prefix.length < 4) prefix.push("0");
  return `${prefix.join(":")}::/64`;
}

// Hashes the IP bucket with a per-site salt so raw client IPs never reach the rate-limit store.
export function clientKey(ip: string, salt = ""): string {
  return createHash("sha256").update(ipBucket(ip) + salt).digest("hex").slice(0, 16);
}
