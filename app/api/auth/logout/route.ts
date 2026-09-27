import { cookies } from "next/headers";
import { cookieOptions } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/security.mjs";
import { json, route } from "@/lib/server";
export function POST(request: Request) { return route(request, async () => {
  (await cookies()).set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return json({ ok: true });
}); }
