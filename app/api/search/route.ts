import { route, json, ApiError } from "@/lib/server";
import { search } from "@/lib/tmdb";
export function GET(req: Request) { return route(req, async () => {
  const query = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (query.length < 2) return json({ items: [] });
  if (query.length > 150) throw new ApiError(400, "Hakusana on liian pitkä.");
  return json({ items: await search(query) });
}); }
