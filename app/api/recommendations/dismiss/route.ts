import { z } from "zod";
import { route, json, body, db } from "@/lib/server";
const idSchema = z.number().int().positive();
export function POST(req: Request) { return route(req, async () => {
  const input = z.object({ tmdbId: idSchema, person: z.enum(["person1", "person2"]) }).strict().parse(await body(req));
  await db().prepare("INSERT INTO recommendation_dismissals (title_key,dismissed_by,created_at) VALUES (?,?,?) ON CONFLICT(title_key) DO NOTHING").bind(`movie:${input.tmdbId}`, input.person, Date.now()).run();
  return json({ ok: true });
}); }
export function DELETE(req: Request) { return route(req, async () => {
  const input = z.object({ tmdbId: idSchema }).strict().parse(await body(req));
  await db().prepare("DELETE FROM recommendation_dismissals WHERE title_key=?").bind(`movie:${input.tmdbId}`).run();
  return json({ ok: true });
}); }
