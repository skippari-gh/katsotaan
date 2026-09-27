import { ApiError, db } from "./server";
import { normalizeGenres } from "./genres";
import { runtimeMinutes } from "./duration";
import type { Title, MediaType, Availability, Provider, TitleFacts } from "./model";
function readToken() { return process.env.TMDB_API_READ_ACCESS_TOKEN?.trim(); }
export function configured() { return Boolean(readToken()); }
async function request(path: string, params: Record<string, string> = {}) {
  const token = readToken();
  if (!token) throw new ApiError(503, "Elokuvahaku odottaa TMDB-yhteyden käyttöönottoa.", "TMDB_NOT_CONFIGURED");
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  for (const [k, v] of Object.entries({ language: "fi-FI", ...params })) url.searchParams.set(k, v);
  let response: Response;
  try { response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(10000) }); }
  catch { throw new ApiError(502, "Elokuvatietoja ei juuri nyt saada haettua. Yritä hetken kuluttua uudelleen."); }
  if (response.status === 401 || response.status === 403) throw new ApiError(503, "TMDB-yhteyden avain pitää tarkistaa.", "TMDB_KEY_INVALID");
  if (response.status === 404) throw new ApiError(404, "Teosta ei löytynyt.");
  if (!response.ok) throw new ApiError(502, "Elokuvahaku on hetkellisesti poissa käytöstä. Yritä uudelleen.");
  return response.json() as Promise<any>;
}
async function cached<T>(key: string, ttl: number, load: () => Promise<T>, staleOk = false): Promise<{ value: T; at: number; stale: boolean }> {
  const row = await db().prepare("SELECT payload, fetched_at FROM tmdb_cache WHERE key = ?").bind(key).first<{ payload: string; fetched_at: number }>();
  if (row && Date.now() - row.fetched_at < ttl) return { value: JSON.parse(row.payload), at: row.fetched_at, stale: false };
  try {
    const value = await load(); const at = Date.now();
    await db().prepare("INSERT INTO tmdb_cache (key,payload,fetched_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at").bind(key, JSON.stringify(value), at).run();
    return { value, at, stale: false };
  } catch (e) { if (row && staleOk) return { value: JSON.parse(row.payload), at: row.fetched_at, stale: true }; throw e; }
}
function normalize(x: any, type: MediaType): Title {
  const date = type === "movie" ? x.release_date : x.first_air_date;
  return { key: `${type}:${x.id}`, tmdbId: x.id, mediaType: type, title: x.title || x.name || "Nimetön teos", originalTitle: x.original_title || x.original_name || "", year: date ? Number(date.slice(0, 4)) : null, overview: x.overview || "", poster: x.poster_path || null, backdrop: x.backdrop_path || null, score: Number(x.vote_average) || 0, votes: Number(x.vote_count) || 0, runtime: x.runtime || x.episode_run_time?.[0] || null, genres: Array.isArray(x.genres) ? normalizeGenres(x.genres) : undefined };
}
export async function search(query: string) {
  const data = await request("search/multi", { query, include_adult: "false", page: "1", region: "FI" });
  return (data.results || []).filter((x: any) => ["movie", "tv"].includes(x.media_type) && !x.adult).slice(0, 16).map((x: any) => normalize(x, x.media_type));
}
export async function relatedMovies(id: number): Promise<Title[]> {
  const { value } = await cached(`recommendations:fi-FI:movie:${id}`, 86400000, async () => {
    const data = await request(`movie/${id}/recommendations`, { page: "1" });
    return (data.results || []).filter((x: any) => Number.isInteger(x.id) && x.id > 0 && !x.adult && (!x.media_type || x.media_type === "movie")).map((x: any) => normalize(x, "movie"));
  }, true);
  return value;
}
export async function details(type: MediaType, id: number) {
  const { value } = await cached(`detail:${type}:${id}`, 86400000, async () => {
    const x = await request(`${type}/${id}`);
    if (!x.overview) { const en = await request(`${type}/${id}`, { language: "en-US" }); x.overview = en.overview; }
    return normalize(x, type);
  }, true); return value;
}
export async function titleFacts(type: MediaType, id: number): Promise<TitleFacts> {
  const { value } = await cached<TitleFacts>(`facts:fi-FI:${type}:${id}`, 86400000, async () => {
    const row = await db().prepare("SELECT payload, fetched_at FROM tmdb_cache WHERE key = ?").bind(`detail:${type}:${id}`).first<{ payload: string; fetched_at: number }>();
    const existing = row && Date.now() - row.fetched_at < 86400000 ? JSON.parse(row.payload) as Title : null;
    if (existing && Array.isArray(existing.genres)) return { runtime: type === "movie" ? runtimeMinutes(existing.runtime) : null, genres: normalizeGenres(existing.genres) };
    // Older cached details have no genres. Fetch fresh facts without changing saved titles.
    const data = await request(`${type}/${id}`);
    return { runtime: type === "movie" ? runtimeMinutes(data.runtime) : null, genres: normalizeGenres(data.genres) };
  }, true);
  return value;
}

export async function availability(type: MediaType, id: number): Promise<Availability> {
  const { value, at, stale } = await cached<any>(`providers:FI:${type}:${id}`, 21600000, async () => { const data = await request(`${type}/${id}/watch/providers`); return data.results?.FI || {}; }, true);
  const providers = (list: any[] | undefined): Provider[] => [...new Map((list || []).map(p => [p.provider_id, { id: p.provider_id, name: p.provider_name, logo: p.logo_path || null }])).values()];
  const link = typeof value.link === "string" && /^https:\/\/(www\.)?themoviedb\.org\//.test(value.link) ? value.link : null;
  return { subscription: providers(value.flatrate), rent: providers(value.rent), buy: providers(value.buy), free: providers([...(value.free || []), ...(value.ads || [])]), link, checkedAt: at, stale };
}
