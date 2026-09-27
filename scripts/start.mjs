import { cpSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const standalone = join(root, ".next/standalone");
if (!existsSync(join(standalone, "server.js"))) {
  console.error("Tuotantoversio puuttuu. Suorita ensin npm run build.");
  process.exit(1);
}
cpSync(join(root, ".next/static"), join(standalone, ".next/static"), { recursive: true });
cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });
// Resolve data before the standalone server changes its working directory.
const { resolve } = await import("node:path");
process.env.DATA_DIR = resolve(root, process.env.DATA_DIR || "./data");
process.env.NODE_ENV = "production";
process.env.HOSTNAME = "0.0.0.0";
process.env.PORT ||= "3000";
process.env.NEXT_TELEMETRY_DISABLED ||= "1";
await import(pathToFileURL(join(standalone, "server.js")).href);
