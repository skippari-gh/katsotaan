import { z } from "zod";
import { route, json } from "@/lib/server";
import { availability } from "@/lib/tmdb";
export function GET(req: Request) { return route(req, async () => {
  const keys = z.array(z.string().regex(/^(movie|tv):[1-9]\d*$/)).min(1).max(8).parse((new URL(req.url).searchParams.get("keys") || "").split(","));
  const items: Record<string, unknown> = {}; const errors: string[] = [];
  await Promise.all(keys.map(async key => { const [type, id] = key.split(":"); try { items[key] = await availability(type as "movie" | "tv", Number(id)); } catch { errors.push(key); } }));
  return json({ items, errors });
}); }
