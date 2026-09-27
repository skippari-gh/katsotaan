import { existsSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { randomBytes } from "node:crypto";
import { Writable } from "node:stream";
import { hashPassword } from "../lib/security.mjs";

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error("Avaa pääte projektin kansioon ja suorita npm run setup. Salaisuuksia ei lueta komentorivin argumenteista.");
  process.exit(1);
}
if (existsSync(".env")) {
  console.error(".env on jo olemassa. Sitä ei korvattu. Muokkaa asetuksia siinä, tai siirrä se ensin turvalliseen paikkaan ja aja käyttöönotto uudelleen.");
  process.exit(1);
}
let muted = false;
const output = new Writable({ write(chunk, _encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });
rl.on("SIGINT", () => { muted = false; process.stdout.write("\nPeruutettu.\n"); rl.close(); process.exit(130); });
async function ask(prompt, secret = false) {
  const pending = rl.question(prompt);
  muted = secret;
  try { return await pending; } finally { if (secret) process.stdout.write("\n"); muted = false; }
}
function name(value, fallback) {
  const clean = value.trim() || fallback;
  if (clean.length > 30 || /[\r\n\u0000-\u001f"'`\\$#]/.test(clean)) throw new Error("Näyttönimessä saa olla enintään 30 tavallista merkkiä.");
  return clean;
}
try {
  console.log("\nKatsotaan – oman erillisen palvelun käyttöönotto\nSalasana ja TMDB-token eivät näy kirjoitettaessa.\n");
  const url = new URL((await ask("Palvelun osoite [http://localhost:3000]: ")).trim() || "http://localhost:3000");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash || (url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) throw new Error("Anna HTTPS-osoite ilman polkua, tai paikallinen http://localhost:3000.");
  const first = name(await ask("Ensimmäisen katsojan nimi [Katsoja 1]: "), "Katsoja 1");
  const second = name(await ask("Toisen katsojan nimi [Katsoja 2]: "), "Katsoja 2");
  const password = await ask("Yhteinen salasana (12–256 merkkiä): ", true);
  if (password.length < 12 || password.length > 256) throw new Error("Valitse vähintään 12 ja enintään 256 merkkiä pitkä salasana.");
  if (password !== await ask("Salasana uudelleen: ", true)) throw new Error("Salasanat eivät täsmää.");
  const token = (await ask("Oma TMDB API Read Access Token (voit ohittaa Enterillä): ", true)).trim();
  if (token && !/^[a-zA-Z0-9._-]+$/.test(token)) throw new Error("Tokenissa on odottamattomia merkkejä. Kopioi API Read Access Token sellaisenaan.");
  const hash = await hashPassword(password);
  writeFileSync(".env", [
    "# Vain tämän oman asennuksen asetukset. Älä jaa tätä tiedostoa.",
    `APP_URL=${url.origin}`,
    `AUTH_PASSWORD_HASH=${hash}`,
    `AUTH_SECRET=${randomBytes(48).toString("hex")}`,
    `TMDB_API_READ_ACCESS_TOKEN=${token}`,
    "DATA_DIR=./data",
    `NEXT_PUBLIC_VIEWER_ONE_NAME="${first}"`,
    `NEXT_PUBLIC_VIEWER_TWO_NAME="${second}"`,
    "",
  ].join("\n"), { mode: 0o600, flag: "wx" });
  console.log("\nAsetukset tallennettu .env-tiedostoon. Salasanaa ei tallennettu selväkielisenä.\nSeuraavaksi: npm run build ja npm start\nTietokanta luodaan tyhjänä ensimmäisellä käyttökerralla.");
  if (!token) console.log("Elokuvahaku avautuu, kun lisäät oman TMDB-tokenin .env-tiedostoon ja käynnistät palvelun uudelleen.");
} catch (error) { console.error(error instanceof Error ? error.message : "Käyttöönotto epäonnistui."); process.exitCode = 1; }
finally { rl.close(); }
