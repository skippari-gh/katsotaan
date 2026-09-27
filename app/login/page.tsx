import { redirect } from "next/navigation";
import { authenticated, authConfig } from "@/lib/auth";
import LoginForm from "./login-form";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await authenticated()) redirect("/");
  return <main className="login-page"><div className="login-card"><a className="brand" href="/">katsotaan<span className="brand-dot">.</span></a><p className="eyebrow">MEIDÄN KAHDEN LISTA</p><h1>Tervetuloa kotiin.</h1><p>Kirjaudu yhteisellä salasanalla.</p>{authConfig() ? <LoginForm/> : <p role="alert">Asennus on kesken. Palvelimen ylläpitäjä: suorita <code>npm run setup</code> ja käynnistä palvelu uudelleen.</p>}</div></main>;
}
