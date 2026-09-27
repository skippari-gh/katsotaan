import type { Genre } from "./model";

export const COMMON_GENRES: Genre[] = [
  { id: 18, name: "Draama" }, { id: 35, name: "Komedia" }, { id: 53, name: "Trilleri" },
  { id: 27, name: "Kauhu" }, { id: 28, name: "Toiminta" }, { id: 878, name: "Sci-fi" },
  { id: 80, name: "Rikos" }, { id: 10749, name: "Romantiikka" }, { id: 99, name: "Dokumentti" },
  { id: 16, name: "Animaatio" }, { id: 12, name: "Seikkailu" }, { id: 14, name: "Fantasia" },
];
const labels: Record<number, string> = {
  ...Object.fromEntries(COMMON_GENRES.map(genre => [genre.id, genre.name])),
  36: "Historia", 10402: "Musiikki", 9648: "Mysteeri", 10751: "Perhe", 10752: "Sota", 37: "Western",
  10770: "TV-elokuva", 10759: "Toiminta ja seikkailu", 10762: "Lapset", 10763: "Uutiset",
  10764: "Tosi-tv", 10765: "Sci-fi ja fantasia", 10766: "Saippuasarja", 10767: "Keskusteluohjelma", 10768: "Sota ja politiikka",
};
// TMDB uses combined TV categories. Keep their names on cards and include them in either matching filter.
const combinedGenres: Record<number, number[]> = { 10759: [28, 12], 10765: [878, 14], 10768: [10752] };

export function genreName(genre: Genre): string { return labels[genre.id] || genre.name; }
export function normalizeGenres(value: unknown): Genre[] {
  if (!Array.isArray(value)) return [];
  const result = new Map<number, Genre>();
  for (const genre of value) {
    if (!genre || !Number.isInteger(genre.id) || genre.id <= 0 || typeof genre.name !== "string" || !genre.name.trim()) continue;
    result.set(genre.id, { id: genre.id, name: labels[genre.id] || genre.name.trim() });
  }
  return [...result.values()];
}
export function genreOptions(titles: Array<{ genres?: Genre[] }>): Genre[] {
  const result = new Map(COMMON_GENRES.map(genre => [genre.id, genre]));
  for (const title of titles) for (const genre of title.genres || []) {
    if (combinedGenres[genre.id]) {
      for (const id of combinedGenres[genre.id]) if (!result.has(id)) result.set(id, { id, name: labels[id] });
    } else if (!result.has(genre.id)) result.set(genre.id, { id: genre.id, name: genreName(genre) });
  }
  return [...result.values()];
}
export function matchesGenres(genres: Genre[] | undefined, selected: number[]): boolean {
  return !selected.length || Boolean(genres?.some(genre => selected.includes(genre.id) || combinedGenres[genre.id]?.some(id => selected.includes(id))));
}
export function formatGenres(genres: Genre[] | undefined): string {
  return genres?.length ? genres.map(genreName).join(" · ") : "Genret eivät tiedossa";
}
