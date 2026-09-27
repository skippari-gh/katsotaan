export type Person = "person1" | "person2";
export type SelectedBy = "person1" | "person2" | "both";
export type Status = "watchlist" | "watching" | "watched";
export type MediaType = "movie" | "tv";
export type Genre = { id: number; name: string };
export type TitleFacts = { runtime: number | null; genres: Genre[] };
export type Provider = { id: number; name: string; logo: string | null };
export type Availability = { subscription: Provider[]; rent: Provider[]; buy: Provider[]; free: Provider[]; link: string | null; checkedAt: number; stale?: boolean };
export type Title = { key: string; tmdbId: number; mediaType: MediaType; title: string; originalTitle: string; year: number | null; overview: string; poster: string | null; backdrop: string | null; score: number; votes: number; runtime?: number | null; genres?: Genre[] };
export type Recommendation = Title & { reason: { title: string; rating: number } };
export type RecommendationsResult = { items: Recommendation[]; ratedCount: number; needsRatings: boolean; partial: boolean };
export type Entry = Title & { status: Status; note: string; noteVersion: number; addedBy: Person; selectedBy: SelectedBy; createdAt: number; updatedAt: number; watchedAt: number | null; ratings: Partial<Record<Person, number>> };
const one = process.env.NEXT_PUBLIC_VIEWER_ONE_NAME?.trim().slice(0, 30) || "Katsoja 1";
const two = process.env.NEXT_PUBLIC_VIEWER_TWO_NAME?.trim().slice(0, 30) || "Katsoja 2";
export const PERSON: Record<Person, string> = { person1: one, person2: two };
export const SELECTED_BY: Record<SelectedBy, string> = { ...PERSON, both: "Molemmat" };
export const SELECTION_LABEL: Record<SelectedBy, string> = { person1: `Valinta: ${one}`, person2: `Valinta: ${two}`, both: "Molempien valinta" };
export function selectedByPerson(person: Person): SelectedBy { return person; }
export const STATUS: Record<Status, string> = { watchlist: "Katsottavat", watching: "Katson nyt", watched: "Katsotut" };
export const SERVICES = [
  { id: "netflix", name: "Netflix", short: "N", color: "#ed2436", match: /^netflix( standard with ads)?$/i },
  { id: "disney", name: "Disney+", short: "D+", color: "#839dff", match: /^disney\s?plus$/i },
  { id: "max", name: "HBO Max", short: "HBO", color: "#bf9cff", match: /^(hbo )?max$/i },
  { id: "prime", name: "Prime Video", short: "prime", color: "#76cfff", match: /^amazon prime video( with ads)?$/i },
  { id: "apple", name: "Apple TV+", short: "tv+", color: "#f0f0f0", match: /^apple tv( plus|\+| subscription)?$/i },
  { id: "sky", name: "SkyShowtime", short: "sky", color: "#ecd776", match: /^skyshowtime$/i },
  { id: "yle", name: "Yle Areena", short: "yle", color: "#77d4d2", match: /^yle( areena)?$/i },
  { id: "ruutu", name: "Ruutu", short: "R", color: "#86d19c", match: /^ruutu(\+| plus)?$/i },
  { id: "mtv", name: "MTV Katsomo", short: "mtv", color: "#f99fd3", match: /^(mtv katsomo|mtv|c more)$/i },
  { id: "cineast", name: "Cineast", short: "C", color: "#e5e4de", match: /^cineast(?:erna)?$/i },
];
export function ownedProviders(a: Availability | undefined, selected: string[]) {
  if (!a || a.stale) return [];
  return [...a.subscription, ...a.free].filter(p => selected.some(id => SERVICES.find(s => s.id === id)?.match.test(p.name)));
}
export function posterUrl(path: string | null, size = "w342") { return path && /^\/[a-zA-Z0-9._-]+$/.test(path) ? `https://image.tmdb.org/t/p/${size}${path}` : undefined; }
