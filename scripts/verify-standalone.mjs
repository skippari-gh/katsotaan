import assert from "node:assert/strict";
import { mkdtempSync, cpSync, existsSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, basename } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hashPassword } from "../lib/security.mjs";

// Entirely synthetic data. No source installation, credentials or live TMDB calls.
const project = fileURLToPath(new URL("..", import.meta.url));
const standalone = join(project, ".next/standalone");
if (!existsSync(join(standalone, "server.js"))) throw new Error("Run npm run build first.");
const temp = mkdtempSync(join(tmpdir(), "katsotaan-integration-"));
let child;
const exits = [];
let log = "";
const password = randomBytes(24).toString("hex");
const secret = randomBytes(48).toString("hex");
const fakeToken = randomBytes(48).toString("hex");
const hash = await hashPassword(password);
const reservation = createServer();
reservation.listen(0, "127.0.0.1"); await once(reservation, "listening");
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
try {
  cpSync(standalone, join(temp, ".next/standalone"), { recursive: true, filter: source => !basename(source).startsWith(".env") });
  cpSync(join(project, ".next/static"), join(temp, ".next/static"), { recursive: true });
  cpSync(join(project, "public"), join(temp, "public"), { recursive: true });
  mkdirSync(join(temp, "scripts"));
  cpSync(join(project, "scripts/start.mjs"), join(temp, "scripts/start.mjs"));
  const mock = join(temp, "mock-tmdb.mjs");
  writeFileSync(mock, `
    const actual = globalThis.fetch;
    const title = id => ({ id, media_type: 'movie', title: 'Testielokuva ' + id, original_title: 'Test Film ' + id, release_date: '2024-01-01', overview: 'Synteettinen testikuvaus.', vote_average: 8, vote_count: 100, runtime: 107, genres: [{ id: 18, name: 'Draama' }] });
    globalThis.fetch = async (input, options = {}) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      if (url.hostname !== 'api.themoviedb.org') return actual(input, options);
      if (new Headers(options.headers).get('Authorization') !== 'Bearer ' + process.env.TMDB_API_READ_ACCESS_TOKEN) return Response.json({}, {status: 401});
      if (url.searchParams.get('language') !== 'fi-FI') return Response.json({}, {status: 400});
      if (url.pathname.endsWith('/search/multi')) {
        if (url.searchParams.get('region') !== 'FI') return Response.json({}, {status: 400});
        return Response.json({results: [title(910001), {...title(910002), media_type: 'tv', name: 'Testisarja', first_air_date: '2024-01-01'}]});
      }
      if (url.pathname.endsWith('/watch/providers')) return Response.json({results: {FI: {flatrate: [{provider_id: 8, provider_name: 'Netflix'}], rent: [{provider_id: 2, provider_name: 'Apple TV'}], link: 'https://www.themoviedb.org/movie/910001/watch?locale=FI'}, US: {flatrate: [{provider_id: 999, provider_name: 'Not Finland'}]}}});
      if (url.pathname.endsWith('/recommendations')) return Response.json({results: [title(910003)]});
      const id = Number(url.pathname.split('/').at(-1));
      return Response.json(url.pathname.includes('/tv/') ? {...title(id), name: 'Testisarja', first_air_date: '2024-01-01'} : title(id));
    };
  `);
  const childEnv = {
    PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT,
    NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", HOSTNAME: "127.0.0.1", PORT: String(port),
    APP_URL: origin, AUTH_PASSWORD_HASH: hash, AUTH_SECRET: secret, TMDB_API_READ_ACCESS_TOKEN: fakeToken,
    DATA_DIR: join(temp, "test-data"),
  };
  async function start() {
    child = spawn(process.execPath, ["--import", pathToFileURL(mock).href, "--env-file-if-exists=.env", join(temp, "scripts/start.mjs")], { cwd: temp, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
    exits.push(once(child, "exit"));
    child.stdout.on("data", chunk => { log += chunk; }); child.stderr.on("data", chunk => { log += chunk; });
    for (let i = 0; i < 200; i++) {
      if (child.exitCode !== null) throw new Error("Test server exited before becoming ready.");
      try { if ((await fetch(origin + "/login")).ok) return; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("Test server did not start.");
  }
  async function stop() { if (child && child.exitCode === null) { child.kill("SIGTERM"); await exits.at(-1); } }
  let cookie;
  let checks = 0;
  function check(value, message) { assert.ok(value, message); checks++; }
  async function request(path, method = "GET", data, options = {}) {
    const headers = { "Content-Type": "application/json", Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...options.headers };
    const response = await fetch(origin + path, { method, redirect: "manual", headers, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch {}
    return { status: response.status, headers: response.headers, text, data: json };
  }
  await start();
  check((await request("/")).status === 307, "Home requires sign-in");
  for (const path of ["/api/library", "/api/search?q=test", "/api/availability?keys=movie:910001", "/api/title-facts?keys=movie:910001", "/api/runtimes?keys=movie:910001", "/api/recommendations"]) check((await request(path)).status === 401, `Protected ${path}`);
  check((await request("/api/library", "GET", undefined, { headers: { "oai-authenticated-user-id": "test", "oai-authenticated-user-email": "test@example.com" } })).status === 401, "Caller-supplied identity headers cannot grant access");
  check((await request("/api/auth/login", "POST", { password }, { headers: { Origin: "https://other.example" } })).status === 403, "Cross-origin login blocked");
  check((await request("/api/auth/login", "POST", { password: randomBytes(24).toString("hex") })).status === 401, "Wrong password rejected");
  const login = await request("/api/auth/login", "POST", { password });
  check(login.status === 200, "Login works");
  const setCookie = login.headers.get("set-cookie") || "";
  check(/HttpOnly/i.test(setCookie) && /SameSite=strict/i.test(setCookie), "Session cookie has appropriate browser protections");
  cookie = setCookie.split(";")[0];
  const empty = await request("/api/library");
  check(empty.data.items.length === 0 && empty.data.services.length === 0, "Installation starts empty");
  check(empty.data.tmdbConfigured === true, "Own server token is configured");
  check(!(await request("/")).text.includes(fakeToken), "Token never rendered in HTML");
  check((await request("/api/library", "GET", undefined, { headers: { Cookie: cookie + "x" } })).status === 401, "Tampered session rejected");
  const search = await request("/api/search?q=test");
  check(search.status === 200 && search.data.items.length === 2, "Movie and TV search uses own token and FI/fi-FI");
  const item = { tmdbId: 910001, mediaType: "movie", person: "person1", selectedBy: "both" };
  check((await request("/api/library", "POST", item)).status === 201, "Movie add");
  check((await request("/api/library", "POST", item)).status === 200, "Duplicate add idempotent");
  check((await request("/api/library", "POST", { ...item, tmdbId: 910002, mediaType: "tv", person: "person2", selectedBy: "person2" })).status === 201, "Series add");
  check((await request("/api/services", "PATCH", { id: "cineast", enabled: true })).status === 200, "Shared services");
  check((await request("/api/library/movie:910001", "PATCH", { status: "watched" })).status === 200, "Mark seen");
  for (const [person, rating] of [["person1", 4], ["person2", 5]]) check((await request("/api/library/movie:910001", "PATCH", { person, rating })).status === 200, "Independent ratings");
  check((await request("/api/library/movie:910001", "PATCH", { note: "Testimuistiinpano", noteVersion: 0 })).status === 200, "Note saved");
  check((await request("/api/library/movie:910001", "PATCH", { note: "Stale", noteVersion: 0 })).status === 409, "Conflicting note protected");
  check((await request("/api/library/movie:910001", "PATCH", { selectedBy: "person2" })).status === 200, "Selector editable");
  check((await request("/api/library/movie:910001", "PATCH", { person: "unknown", rating: 4 })).status === 400, "Invalid person rejected");
  check((await request("/api/library/movie:910001", "PATCH", { status: "watching" }, { headers: { Origin: "https://other.example" } })).status === 403, "Cross-origin mutation blocked");
  const availability = await request("/api/availability?keys=movie:910001");
  check(availability.data.items["movie:910001"].subscription[0].name === "Netflix" && availability.data.items["movie:910001"].rent.length === 1, "FI availability categories");
  const facts = await request("/api/title-facts?keys=movie:910001,tv:910002");
  check(facts.data.items["movie:910001"].runtime === 107 && facts.data.items["tv:910002"].genres[0].name === "Draama", "Runtime and movie/TV genres");
  check((await request("/api/recommendations")).data.items[0].key === "movie:910003", "Ratings produce a recommendation");
  check((await request("/api/recommendations/dismiss", "POST", { tmdbId: 910003, person: "person2" })).status === 200, "Dismiss recommendation");
  check((await request("/api/recommendations")).data.items.length === 0, "Dismissal is shared");
  check((await request("/api/recommendations/dismiss", "DELETE", { tmdbId: 910003 })).status === 200, "Undo dismissal");
  check((await request("/api/library", "POST", { ...item, tmdbId: 910003, status: "watched" })).status === 201, "Seen recommendation without required rating");
  const before = (await request("/api/library")).data;
  const watched = before.items.find(item => item.key === "movie:910001");
  check(watched.watchedAt > 0 && watched.status === "watched" && watched.note === "Testimuistiinpano" && watched.selectedBy === "person2" && watched.ratings.person1 === 4 && watched.ratings.person2 === 5, "Watched date and saved fields");
  cookie = undefined;
  const otherLogin = await request("/api/auth/login", "POST", { password });
  cookie = otherLogin.headers.get("set-cookie").split(";")[0];
  check(JSON.stringify((await request("/api/library")).data) === JSON.stringify(before), "Second device sees the same data");
  await stop(); await start();
  check(JSON.stringify((await request("/api/library")).data) === JSON.stringify(before), "Data and session survive server restart");
  check((await request("/api/library/movie:910001", "DELETE", {})).status === 200, "Delete works");
  check(!(await request("/api/library")).data.items.some(item => item.key === "movie:910001"), "Deleted entry disappears");
  check((await request("/api/auth/logout", "POST", {})).headers.get("set-cookie").includes("Max-Age=0"), "Logout expires cookie");
  cookie = undefined;
  check((await request("/api/library")).status === 401, "Logged-out device denied");
  let limited = false;
  for (let i = 0; i < 21; i++) {
    if ((await request("/api/auth/login", "POST", { password: randomBytes(12).toString("hex") })).status === 429) { limited = true; break; }
  }
  check(limited, "Login attempt rate limit enforced");
  check(!log.includes(secret) && !log.includes(fakeToken) && !log.includes(password), "No credentials in server logs");
  console.log(`PASS: ${checks} standalone integration checks (isolated server, synthetic TMDB and temporary database).`);
} finally {
  if (child && child.exitCode === null) { child.kill("SIGTERM"); await exits.at(-1); }
  rmSync(temp, { recursive: true, force: true });
}
