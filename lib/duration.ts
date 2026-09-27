export const DURATION_OPTIONS = [
  { value: "all", label: "Kaikki kestot" },
  { value: "under90", label: "Alle 90 min" },
  { value: "90", label: "90 min" },
  { value: "120", label: "2 h" },
  { value: "150", label: "2,5 h" },
  { value: "180", label: "3 h" },
  { value: "custom", label: "Oma aika" },
] as const;
export type DurationChoice = typeof DURATION_OPTIONS[number]["value"];

export function runtimeMinutes(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}
export function formatRuntime(value: unknown): string {
  const minutes = runtimeMinutes(value);
  if (minutes === null) return "Kesto ei tiedossa";
  const hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return hours ? `${hours} h${remainder ? ` ${remainder} min` : ""}` : `${minutes} min`;
}
export function durationLimit(choice: DurationChoice, custom: string): number | null {
  if (choice === "all") return null;
  if (choice === "under90") return 89;
  if (choice === "custom") return /^[1-9]\d{0,3}$/.test(custom) ? Number(custom) : null;
  return Number(choice);
}
export function fitsDuration(title: { mediaType: string; runtime?: number | null }, limit: number | null): boolean {
  if (limit === null) return true;
  const runtime = runtimeMinutes(title.runtime);
  return title.mediaType === "movie" && runtime !== null && runtime <= limit;
}
