import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { resolve, join } from "node:path";

type Result<T = Record<string, unknown>> = { results: T[]; meta: { changes: number } };
class Statement {
  private connection: DatabaseSync;
  private sql: string;
  private values: SQLInputValue[];
  constructor(connection: DatabaseSync, sql: string, values: SQLInputValue[] = []) { this.connection = connection; this.sql = sql; this.values = values; }
  bind(...values: SQLInputValue[]) { return new Statement(this.connection, this.sql, values); }
  async first<T>(): Promise<T | null> { return (this.connection.prepare(this.sql).get(...this.values) as T | undefined) ?? null; }
  async all<T>(): Promise<Result<T>> { return { results: this.connection.prepare(this.sql).all(...this.values) as T[], meta: { changes: 0 } }; }
  async run() { return this.execute(); }
  execute(): Result {
    const stmt = this.connection.prepare(this.sql);
    if (stmt.columns().length) return { results: stmt.all(...this.values), meta: { changes: 0 } };
    return { results: [], meta: { changes: Number(stmt.run(...this.values).changes) } };
  }
}
export class Database {
  private connection: DatabaseSync;
  constructor(directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const filename = join(directory, "katsotaan.sqlite");
    this.connection = new DatabaseSync(filename);
    chmodSync(filename, 0o600);
    this.connection.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS titles (
        key TEXT PRIMARY KEY, tmdb_id INTEGER NOT NULL, media_type TEXT NOT NULL,
        metadata TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'watchlist',
        note TEXT NOT NULL DEFAULT '', note_version INTEGER NOT NULL DEFAULT 0,
        added_by TEXT NOT NULL, selected_by TEXT,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, watched_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS ratings (
        title_key TEXT NOT NULL REFERENCES titles(key) ON DELETE CASCADE,
        person TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        updated_at INTEGER NOT NULL, PRIMARY KEY(title_key, person)
      );
      CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, enabled INTEGER NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS tmdb_cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS recommendation_dismissals (title_key TEXT PRIMARY KEY, dismissed_by TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL);
    `);
  }
  prepare(sql: string) { return new Statement(this.connection, sql); }
  async batch(statements: Statement[]): Promise<Result[]> {
    // No await inside a transaction: other requests cannot interleave.
    this.connection.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map(statement => statement.execute());
      this.connection.exec("COMMIT"); return results;
    } catch (error) { this.connection.exec("ROLLBACK"); throw error; }
  }
  close() { this.connection.close(); }
}
const globalDb = globalThis as typeof globalThis & { katsotaanDb?: Database };
export function database() { return globalDb.katsotaanDb ??= new Database(resolve(process.env.DATA_DIR || "./data")); }
