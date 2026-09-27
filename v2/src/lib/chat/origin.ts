// The environment values that widen the allowlist to the current Netlify deploy.
export interface OriginEnv {
  URL?: string;
  DEPLOY_PRIME_URL?: string;
  DEPLOY_URL?: string;
}

// Returns true when the given Origin header is allowed to call the chat function, including the function's own origin; a missing origin is never allowed.
export function isAllowedOrigin(origin: string | null | undefined, env: OriginEnv = {}, requestUrl?: string): boolean {
  if (!origin) return false;
  if (requestUrl && sameOrigin(origin, requestUrl)) return true;
  const allowed = new Set(
    [
      "https://rraimundo.me",
      "https://www.rraimundo.me",
      env.URL,
      env.DEPLOY_PRIME_URL,
      env.DEPLOY_URL,
      "http://localhost:4321",
      "http://localhost:8888",
    ].filter((value): value is string => Boolean(value)),
  );
  return allowed.has(origin);
}

function sameOrigin(origin: string, requestUrl: string): boolean {
  try {
    return new URL(requestUrl).origin === origin;
  } catch {
    return false;
  }
}
