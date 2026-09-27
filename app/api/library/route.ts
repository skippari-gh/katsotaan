import { z } from "zod";
import { route, json, body, db } from "@/lib/server";
import { readLibrary } from "@/lib/library";
import { details, configured } from "@/lib/tmdb";
import { selectedByPerson } from "@/lib/model";
export const dynamic = "force-dynamic";
export function GET(req: Request) { return route(req, async () => {
  const [items, services] = await Promise.all([readLibrary(), db().prepare("SELECT id FROM services WHERE enabled = 1").all<{ id: string }>()]);
  return json({ items, services: services.results.map(s => s.id), tmdbConfigured: configured() });
}); }
export function POST(req: Request) { return route(req, async () => {
  const input = z.object({ tmdbId: z.number().int().positive(), mediaType: z.enum(["movie", "tv"]), person: z.enum(["person1", "person2"]), selectedBy: z.enum(["person1", "person2", "both"]).optional(), status: z.enum(["watchlist", "watched"]).default("watchlist") }).strict().parse(await body(req));
  const title = await details(input.mediaType, input.tmdbId); const now = Date.now();
  const insert = db().prepare("INSERT INTO titles (key,tmdb_id,media_type,metadata,status,note,note_version,added_by,selected_by,created_at,updated_at,watched_at) VALUES (?,?,?,?,?,'',0,?,?,?,?,?) ON CONFLICT(key) DO NOTHING").bind(title.key, title.tmdbId, title.mediaType, JSON.stringify(title), input.status, input.person, input.selectedBy ?? selectedByPerson(input.person), now, now, input.status === "watched" ? now : null);
  const result = input.status === "watched"
    ? (await db().batch([insert, db().prepare("UPDATE titles SET status='watched',watched_at=COALESCE(watched_at,?),updated_at=? WHERE key=?").bind(now, now, title.key)]))[0]
    : await insert.run();
  return json({ key: title.key, added: result.meta.changes > 0 }, result.meta.changes ? 201 : 200);
}); }
