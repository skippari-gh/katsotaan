import { z } from "zod";
import { ApiError, route, json, body, db } from "@/lib/server";
const keySchema = z.string().regex(/^(movie|tv):[1-9]\d*$/);
type Context = { params: Promise<{ key: string }> };
export function PATCH(req: Request, context: Context) { return route(req, async () => {
  const key = keySchema.parse(decodeURIComponent((await context.params).key));
  const input = z.union([
    z.object({ status: z.enum(["watchlist", "watching", "watched"]) }).strict(),
    z.object({ selectedBy: z.enum(["person1", "person2", "both"]) }).strict(),
    z.object({ note: z.string().max(1000), noteVersion: z.number().int().nonnegative() }).strict(),
    z.object({ person: z.enum(["person1", "person2"]), rating: z.number().int().min(1).max(5).nullable() }).strict(),
  ]).parse(await body(req));
  const row = await db().prepare("SELECT status FROM titles WHERE key = ?").bind(key).first<{ status: string }>();
  if (!row) throw new ApiError(404, "Teos ei enää ole listalla.");
  const now = Date.now();
  if ("status" in input) {
    await db().prepare("UPDATE titles SET status=?,updated_at=?,watched_at=CASE WHEN ?='watched' THEN COALESCE(watched_at,?) ELSE NULL END WHERE key=?").bind(input.status, now, input.status, now, key).run();
  } else if ("selectedBy" in input) {
    await db().prepare("UPDATE titles SET selected_by=?,updated_at=? WHERE key=?").bind(input.selectedBy, now, key).run();
  } else if ("note" in input) {
    const result = await db().prepare("UPDATE titles SET note=?,note_version=note_version+1,updated_at=? WHERE key=? AND note_version=?").bind(input.note.trim(), now, key, input.noteVersion).run();
    if (!result.meta.changes) throw new ApiError(409, "Muistiinpanoa muutettiin toisella laitteella. Kopioi oma tekstisi talteen ja lataa uusin muistiinpano.", "CONFLICT");
  } else {
    if (input.rating === null) await db().prepare("DELETE FROM ratings WHERE title_key=? AND person=?").bind(key, input.person).run();
    else await db().prepare("INSERT INTO ratings (title_key,person,rating,updated_at) VALUES (?,?,?,?) ON CONFLICT(title_key,person) DO UPDATE SET rating=excluded.rating,updated_at=excluded.updated_at").bind(key, input.person, input.rating, now).run();
  }
  return json({ ok: true });
}); }
export function DELETE(req: Request, context: Context) { return route(req, async () => {
  const key = keySchema.parse(decodeURIComponent((await context.params).key));
  await db().prepare("DELETE FROM titles WHERE key=?").bind(key).run(); return json({ ok: true });
}); }
