export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, cache: "no-store", credentials: "same-origin", headers: { "Content-Type": "application/json", ...init?.headers } });
  const data: any = await res.json().catch(() => ({ error: "Yhteys katkesi. Yritä uudelleen." }));
  if (res.status === 401 && !path.startsWith("/api/auth/")) window.location.assign("/login");
  if (!res.ok) throw new Error(data.error || "Pyyntö epäonnistui.");
  return data;
}
