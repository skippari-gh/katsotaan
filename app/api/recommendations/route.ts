import { route, json } from "@/lib/server";
import { recommendMovies } from "@/lib/recommendations";
export const dynamic = "force-dynamic";
export function GET(req: Request) { return route(req, async () => json(await recommendMovies())); }
