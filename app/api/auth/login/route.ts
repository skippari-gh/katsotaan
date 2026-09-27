import { cookies } from "next/headers";
import { authConfig, cookieOptions, sameOriginMutation } from "@/lib/auth";
import { ApiError, body, db, json } from "@/lib/server";
import { createSession, verifyPassword, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/security.mjs";
export async function POST(request: Request) {
  const config = authConfig();
  if (!config) return json({ error: "Palvelun asetukset puuttuvat. Ylläpitäjä: suorita npm run setup." }, 503);
  if (!sameOriginMutation(request)) return json({ error: "Pyyntö ei ole sallittu. Tarkista myös palvelimen APP_URL-asetus." }, 403);
  try {
    const input = await body(request);
    if (!input || typeof input.password !== "string" || input.password.length > 256) return json({ error: "Tarkista salasana." }, 400);
    const now = Date.now();
    // One installation-wide limiter, without trusting client-provided IP headers.
    const attempts = await db().prepare(`
      INSERT INTO login_attempts (id, window_start, attempts) VALUES (1, ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        attempts = CASE WHEN login_attempts.window_start < ? THEN 1 ELSE login_attempts.attempts + 1 END,
        window_start = CASE WHEN login_attempts.window_start < ? THEN excluded.window_start ELSE login_attempts.window_start END
      RETURNING attempts
    `).bind(now, now - 60000, now - 60000).first<{ attempts: number }>();
    if (!attempts || attempts.attempts > 20) return json({ error: "Liian monta yritystä. Odota minuutti ja kokeile uudelleen." }, 429);
    if (!(await verifyPassword(input.password, config.passwordHash))) return json({ error: "Salasana ei täsmää." }, 401);
    (await cookies()).set(SESSION_COOKIE, createSession(config.secret, config.passwordHash), { ...cookieOptions(), maxAge: SESSION_SECONDS });
    return json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return json({ error: "Virheellinen pyyntö." }, 400);
    return json({ error: "Kirjautuminen epäonnistui. Kokeile uudelleen." }, 503);
  }
}
