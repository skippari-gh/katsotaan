import { z } from "zod";
import { route, json, body, db, ApiError } from "@/lib/server";
import { SERVICES } from "@/lib/model";
export function PATCH(req: Request) { return route(req, async () => {
  const data = z.object({ id: z.string(), enabled: z.boolean() }).strict().parse(await body(req));
  if (!SERVICES.some(s => s.id === data.id)) throw new ApiError(400, "Tuntematon palvelu.");
  await db().prepare("INSERT INTO services (id,enabled,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at").bind(data.id, Number(data.enabled), Date.now()).run(); return json({ ok: true });
}); }
