import { authenticated, sameOriginMutation } from "./auth";
import { database } from "./sqlite";
import { ZodError } from "zod";
export class ApiError extends Error { constructor(public status: number, message: string, public code = "ERROR") { super(message); } }
export function db() { return database(); }
export async function authorize(request: Request) {
  if (!(await authenticated())) throw new ApiError(401, "Kirjaudu sisään jatkaaksesi.", "AUTH");
  if (!["GET", "HEAD"].includes(request.method) && !sameOriginMutation(request)) throw new ApiError(403, "Pyyntö ei ole sallittu.");
}
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); }
export async function route(request: Request, run: () => Promise<Response>) {
  try { await authorize(request); return await run(); }
  catch (e) {
    if (e instanceof ApiError) return json({ error: e.message, code: e.code }, e.status);
    if (e instanceof ZodError || e instanceof SyntaxError) return json({ error: "Tarkista antamasi tiedot." }, 400);
    console.error("Katsotaan request failed");
    return json({ error: "Tallennus tai lataus epäonnistui. Tietojasi ei poistettu. Yritä uudelleen." }, 503);
  }
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length")) > 16000) throw new ApiError(413, "Liian pitkä teksti.");
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing JSON");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16000) { await reader.cancel(); throw new ApiError(413, "Liian pitkä teksti."); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
