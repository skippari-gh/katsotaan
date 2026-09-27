import { z } from "zod";
import { route, json } from "@/lib/server";
import { details } from "@/lib/tmdb";
import { runtimeMinutes } from "@/lib/duration";

export function GET(req: Request) { return route(req, async () => {
  const keys = z.array(z.string().regex(/^movie:[1-9]\d*$/)).min(1).max(8).parse((new URL(req.url).searchParams.get("keys") || "").split(","));
  const items: Record<string, number | null> = {};
  const errors: string[] = [];
  await Promise.all([...new Set(keys)].map(async key => {
    try { items[key] = runtimeMinutes((await details("movie", Number(key.split(":")[1]))).runtime); }
    catch { errors.push(key); }
  }));
  return json({ items, errors });
}); }
