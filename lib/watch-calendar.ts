import type { Entry } from "./model";

const dateParts = new Intl.DateTimeFormat("en", {
  timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit",
});
const shortDate = new Intl.DateTimeFormat("fi-FI", { timeZone: "Europe/Helsinki" });
const monthName = new Intl.DateTimeFormat("fi-FI", { timeZone: "UTC", month: "long", year: "numeric" });
const dayName = new Intl.DateTimeFormat("fi-FI", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });

// Use one shared Finnish calendar day even when the two devices are in different time zones.
export function watchDateKey(timestamp: number): string {
  const parts = dateParts.formatToParts(timestamp);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function formatWatchDate(timestamp: number): string { return shortDate.format(timestamp); }
export function formatCalendarMonth(month: string): string { return monthName.format(new Date(`${month}-01T12:00:00Z`)); }
export function formatCalendarDay(day: string): string { return dayName.format(new Date(`${day}T12:00:00Z`)); }

export function shiftCalendarMonth(month: string, offset: number): string {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function calendarDays(month: string): Array<string | null> {
  const [year, number] = month.split("-").map(Number);
  const leading = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((leading + length) / 7) * 7 }, (_, index) => {
    const day = index - leading + 1;
    return day >= 1 && day <= length ? `${month}-${String(day).padStart(2, "0")}` : null;
  });
}

export function watchedMoviesByDay(items: Entry[]): Record<string, Entry[]> {
  const days: Record<string, Entry[]> = {};
  for (const entry of items.filter(item => item.status === "watched" && item.mediaType === "movie" && item.watchedAt !== null && Number.isFinite(item.watchedAt)).sort((a, b) => b.watchedAt! - a.watchedAt! || a.key.localeCompare(b.key))) {
    const day = watchDateKey(entry.watchedAt!);
    (days[day] ||= []).push(entry);
  }
  return days;
}
