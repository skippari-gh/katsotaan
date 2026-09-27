import { readLibrary } from "./library";
import { ApiError, db } from "./server";
import { relatedMovies } from "./tmdb";
import type { Recommendation, RecommendationsResult } from "./model";

export async function recommendMovies(): Promise<RecommendationsResult> {
  const [library, dismissed] = await Promise.all([
    readLibrary(),
    db().prepare("SELECT title_key FROM recommendation_dismissals").all<{ title_key: string }>(),
  ]);
  const excluded = new Set([...library.map(x => x.key), ...dismissed.results.map(x => x.title_key)]);
  const rated = library.filter(x => x.status === "watched" && x.mediaType === "movie").flatMap(entry => {
    const stars = Object.values(entry.ratings).filter((n): n is number => typeof n === "number" && n >= 1 && n <= 5);
    return stars.length ? [{ entry, rating: stars.reduce((sum, n) => sum + n, 0) / stars.length }] : [];
  });
  // Use a bounded set of rated films; both people's available ratings have equal weight.
  const positive = rated.filter(x => x.rating >= 3).sort((a, b) => b.rating - a.rating || b.entry.updatedAt - a.entry.updatedAt).slice(0, 6);
  const negative = rated.filter(x => x.rating < 3).sort((a, b) => a.rating - b.rating || b.entry.updatedAt - a.entry.updatedAt).slice(0, 3);
  if (!positive.length) return { items: [], ratedCount: rated.length, needsRatings: true, partial: false };
  const seeds = [...positive, ...negative];
  const results = await Promise.allSettled(seeds.map(x => relatedMovies(x.entry.tmdbId)));
  if (!results.slice(0, positive.length).some(r => r.status === "fulfilled")) {
    const failed = results.find(r => r.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    throw new ApiError(502, "Suosituksia ei juuri nyt saada haettua. Yritä uudelleen.");
  }
  const candidates = new Map<string, { item: Recommendation; points: number; strongest: number }>();
  const penalties = new Map<string, number>();
  results.forEach((result, seedIndex) => {
    if (result.status !== "fulfilled") return;
    const seed = seeds[seedIndex];
    const weight = seed.rating === 3 ? 0.25 : seed.rating - 3;
    const seen = new Set<string>();
    result.value.forEach((title, index) => {
      if (excluded.has(title.key) || seen.has(title.key)) return;
      seen.add(title.key);
      const contribution = weight / (1 + index / 8);
      if (weight < 0) { penalties.set(title.key, (penalties.get(title.key) || 0) - contribution); return; }
      const prior = candidates.get(title.key);
      const reason = { title: seed.entry.title, rating: seed.rating };
      if (prior) {
        prior.points += contribution;
        if (contribution > prior.strongest) { prior.item.reason = reason; prior.strongest = contribution; }
      } else candidates.set(title.key, { item: { ...title, reason }, points: contribution, strongest: contribution });
    });
  });
  const ranked = [...candidates.values()].map(x => ({ ...x, points: x.points - (penalties.get(x.item.key) || 0) }));
  const items = ranked.filter(x => x.points > 0).sort((a, b) => b.points - a.points || b.item.score - a.item.score || a.item.tmdbId - b.item.tmdbId).slice(0, 12).map(x => x.item);
  return { items, ratedCount: rated.length, needsRatings: false, partial: results.some(r => r.status === "rejected") };
}
