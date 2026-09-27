import { cookies } from "next/headers";
import { validPasswordHash, validSession, SESSION_COOKIE } from "./security.mjs";
export function authConfig() {
  const secret = process.env.AUTH_SECRET || "";
  const passwordHash = process.env.AUTH_PASSWORD_HASH || "";
  let origin = "";
  try {
    const url = new URL(process.env.APP_URL || "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return null;
    origin = url.origin;
  } catch { return null; }
  return secret.length >= 32 && validPasswordHash(passwordHash) ? { secret, passwordHash, origin } : null;
}
export async function authenticated() {
  const config = authConfig();
  return Boolean(config && validSession((await cookies()).get(SESSION_COOKIE)?.value, config.secret, config.passwordHash));
}
export function sameOriginMutation(request: Request) {
  const config = authConfig();
  return Boolean(config && request.headers.get("origin") === config.origin && request.headers.get("sec-fetch-site") !== "cross-site" && request.headers.get("content-type")?.split(";")[0].trim() === "application/json");
}
export function cookieOptions() { return { httpOnly: true, sameSite: "strict" as const, secure: authConfig()?.origin.startsWith("https:") ?? true, path: "/" }; }
