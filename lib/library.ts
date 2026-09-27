import { db } from "./server";
import { selectedByPerson, type Entry, type Person } from "./model";
export async function readLibrary(): Promise<Entry[]> {
  const [titles, ratings] = await db().batch([db().prepare("SELECT * FROM titles ORDER BY created_at DESC, key"), db().prepare("SELECT title_key, person, rating FROM ratings")]);
  const byTitle: Record<string, Partial<Record<Person, number>>> = {};
  for (const r of ratings.results as any[]) { (byTitle[r.title_key] ||= {})[r.person as Person] = r.rating; }
  return (titles.results as any[]).map(row => ({ ...JSON.parse(row.metadata), key: row.key, status: row.status, note: row.note, noteVersion: row.note_version, addedBy: row.added_by, selectedBy: row.selected_by ?? selectedByPerson(row.added_by), createdAt: row.created_at, updatedAt: row.updated_at, watchedAt: row.watched_at, ratings: byTitle[row.key] || {} }));
}
