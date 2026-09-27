import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const SESSION_COOKIE = "katsotaan-session";
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64, options);
  return `scrypt-v1:${salt}:${key.toString("hex")}`;
}
export function validPasswordHash(hash) { return typeof hash === "string" && /^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash); }
export async function verifyPassword(password, hash) {
  if (typeof password !== "string" || password.length > 256 || !validPasswordHash(hash)) return false;
  const [, salt, expected] = hash.split(":");
  const actual = await scrypt(password, salt, 64, options);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
function signature(payload, secret, passwordHash) { return createHmac("sha256", secret).update(`${passwordHash}:${payload}`).digest("base64url"); }
export function createSession(secret, passwordHash, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ exp: now + SESSION_SECONDS * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return `${payload}.${signature(payload, secret, passwordHash)}`;
}
export function validSession(token, secret, passwordHash, now = Date.now()) {
  if (typeof token !== "string" || token.length > 1000 || typeof secret !== "string" || secret.length < 32 || !validPasswordHash(passwordHash)) return false;
  const [payload, signed, extra] = token.split(".");
  if (!payload || !signed || extra !== undefined) return false;
  const expected = Buffer.from(signature(payload, secret, passwordHash));
  const received = Buffer.from(signed);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Number.isSafeInteger(data.exp) && data.exp > now && data.exp <= now + SESSION_SECONDS * 1000 && typeof data.nonce === "string";
  } catch { return false; }
}
