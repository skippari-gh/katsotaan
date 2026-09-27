import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword, createSession, validSession, SESSION_SECONDS } from "../lib/security.mjs";

test("Passwords are salted; incorrect and malformed hashes fail closed", async () => {
  const password = randomBytes(24).toString("hex");
  const first = await hashPassword(password), second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password + "x", first), false);
  assert.equal(await verifyPassword(password, ""), false);
});
test("Sessions reject tampering, expiry and credentials from another installation", async () => {
  const secret = randomBytes(48).toString("hex");
  const hash = await hashPassword(randomBytes(24).toString("hex"));
  const now = Date.now(), session = createSession(secret, hash, now);
  assert.equal(validSession(session, secret, hash, now), true);
  assert.equal(validSession(session + "x", secret, hash, now), false);
  assert.equal(validSession(session, randomBytes(48).toString("hex"), hash, now), false);
  assert.equal(validSession(session, secret, await hashPassword(randomBytes(24).toString("hex")), now), false);
  assert.equal(validSession(session, secret, hash, now + SESSION_SECONDS * 1000), false);
  for (const value of [null, "", "x.y.z", "x.y", "x".repeat(1001)]) assert.equal(validSession(value, secret, hash, now), false);
});
