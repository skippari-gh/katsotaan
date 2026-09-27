"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client-api";
export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) }); window.location.assign("/"); }
    catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <form onSubmit={submit} className="login-form"><input type="text" name="username" autoComplete="username" value="katsotaan" readOnly hidden/><label htmlFor="password">Yhteinen salasana</label><input id="password" name="password" type="password" autoComplete="current-password" autoFocus required maxLength={256} value={password} onChange={e => setPassword(e.target.value)}/>{error && <p className="login-error" role="alert">{error}</p>}<button type="submit" className="button primary" disabled={busy}>{busy ? "Kirjaudutaan…" : "Kirjaudu sisään"}</button></form>;
}
