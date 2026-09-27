"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Plus, RefreshCw, Sparkles, Star, X, Clock3 } from "lucide-react";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import { ownedProviders, type Availability, type Entry, type Person, type RecommendationsResult, type Title } from "@/lib/model";
import Poster from "./title-poster";
import { useTitleFacts } from "@/lib/use-title-facts";
import { formatGenres } from "@/lib/genres";
import { formatRuntime, runtimeMinutes } from "@/lib/duration";

type Props = {
  library: Entry[]; services: string[]; person: Person | null; busy: string[];
  onAdd: (title: Title) => void; onSeen: (title: Title) => void;
  onNeedPerson: () => void; onViewWatched: () => void;
};

export default function Recommendations({ library, services, person, busy, onAdd, onSeen, onNeedPerson, onViewWatched }: Props) {
  const [data, setData] = useState<RecommendationsResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [dismissing, setDismissing] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Record<string, Availability>>({});
  const [availabilityErrors, setAvailabilityErrors] = useState<string[]>([]);
  const activeDismissals = useRef(new Set<string>());
  const requestSerial = useRef(0);
  const profile = JSON.stringify(library.map(x => [x.key, x.status, x.ratings]));

  useEffect(() => {
    const controller = new AbortController(); const serial = ++requestSerial.current;
    setLoading(true); setError("");
    api<RecommendationsResult>("/api/recommendations", { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted && serial === requestSerial.current) setData(result); })
      .catch(e => { if (!controller.signal.aborted && serial === requestSerial.current) setError((e as Error).message); })
      .finally(() => { if (!controller.signal.aborted && serial === requestSerial.current) setLoading(false); });
    return () => controller.abort();
  }, [profile, refresh]);

  useEffect(() => {
    const sync = () => { if (!document.hidden) setRefresh(v => v + 1); };
    const timer = setInterval(sync, 30000);
    window.addEventListener("focus", sync); window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { clearInterval(timer); window.removeEventListener("focus", sync); window.removeEventListener("online", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);

  const providerKeys = data?.items.map(x => x.key).sort().join(",") || "";
  useEffect(() => {
    if (!providerKeys) return;
    const controller = new AbortController(); const keys = providerKeys.split(",");
    setAvailabilityErrors([]);
    void (async () => {
      for (let i = 0; i < keys.length; i += 8) {
        const batch = keys.slice(i, i + 8);
        try {
          const result = await api<{ items: Record<string, Availability>; errors: string[] }>(`/api/availability?keys=${encodeURIComponent(batch.join(","))}`, { signal: controller.signal });
          if (controller.signal.aborted) return;
          setAvailability(previous => ({ ...previous, ...result.items }));
          setAvailabilityErrors(previous => [...previous, ...result.errors]);
        } catch { if (controller.signal.aborted) return; setAvailabilityErrors(previous => [...previous, ...batch]); }
      }
    })();
    return () => controller.abort();
  }, [providerKeys]);

  async function dismiss(title: Title) {
    if (!person) { onNeedPerson(); return; }
    if (activeDismissals.current.has(title.key)) return;
    activeDismissals.current.add(title.key); setDismissing([...activeDismissals.current]);
    try {
      await api("/api/recommendations/dismiss", { method: "POST", body: JSON.stringify({ tmdbId: title.tmdbId, person }) });
      ++requestSerial.current;
      setData(previous => previous ? { ...previous, items: previous.items.filter(x => x.key !== title.key) } : previous);
      setRefresh(v => v + 1);
      toast.success("Suositus poistettu", { action: { label: "Kumoa", onClick: () => {
        void api("/api/recommendations/dismiss", { method: "DELETE", body: JSON.stringify({ tmdbId: title.tmdbId }) })
          .then(() => setRefresh(v => v + 1)).catch(e => toast.error((e as Error).message));
      } } });
    } catch (e) { toast.error((e as Error).message); }
    finally { activeDismissals.current.delete(title.key); setDismissing([...activeDismissals.current]); }
  }

  const savedKeys = new Set(library.map(x => x.key));
  const items = data?.items.filter(x => !savedKeys.has(x.key)) || [];
  const { facts } = useTitleFacts(items);
  return <section className="recommendations-section" aria-label="Elokuvasuositukset" aria-busy={loading}>
    <div className="recommendations-heading"><div><h2>Suosituksia teille</h2><p>Katsotuille elokuville antamienne tähtien perusteella. Molempien arviot huomioidaan.</p></div><button className="icon-button" onClick={() => setRefresh(v => v + 1)} disabled={loading} aria-label="Päivitä suositukset"><RefreshCw size={18} className={loading ? "spin" : ""}/></button></div>
    {error && <div className="sync-error" role="alert"><p>{error}</p><button className="text-button" onClick={() => setRefresh(v => v + 1)}>Yritä uudelleen</button></div>}
    {data?.partial && <p className="filter-info">Osa suosituksista jäi hakematta. Voit yrittää päivittämistä uudelleen.</p>}
    {!data && loading ? <div className="poster-grid" aria-label="Haetaan suosituksia">{[1,2,3,4,5].map(n => <div key={n}><Skeleton className="poster-skeleton"/><Skeleton className="title-skeleton"/></div>)}</div> : items.length ? <div className="poster-grid">{items.map(title => {
      const a = availability[title.key]; const own = ownedProviders(a, services);
      const subscriptions = a ? [...a.subscription, ...a.free] : [];
      const isBusy = busy.includes(title.key) || dismissing.includes(title.key);
      return <article className="title-card recommendation-card" key={title.key}>
        <div className="recommendation-poster"><Poster title={title}/><span className="poster-shade"/>{title.votes > 0 && <span className="score"><Star size={12} fill="currentColor"/>{title.score.toFixed(1)}</span>}<button className="icon-button recommendation-dismiss" aria-label={`Poista suositus: ${title.title}`} title="Poista suositus" disabled={isBusy} onClick={() => dismiss(title)}>{dismissing.includes(title.key) ? <Loader2 size={18} className="spin"/> : <X size={18}/>}</button>{own.length > 0 && <span className="own-badge"><Check size={13}/> Meidän palvelussa</span>}</div>
        <h3>{title.title}</h3><p className="card-meta">{title.year || "–"}<span>·</span>Elokuva</p>
        <p className="card-runtime"><Clock3 size={13}/>{formatRuntime(runtimeMinutes(title.runtime) ?? facts[title.key]?.runtime)}</p>
        <p className="card-genres">{formatGenres(title.genres ?? facts[title.key]?.genres)}</p>
        <p className="recommendation-reason">Arvionne perusteella: <strong>{title.reason.title}</strong> · {title.reason.rating.toLocaleString("fi-FI", { maximumFractionDigits: 1 })}/5</p>
        {title.overview && <p className="recommendation-overview">{title.overview}</p>}
        <p className={`card-provider ${own.length ? "is-ours" : ""}`}>{!a ? availabilityErrors.includes(title.key) ? "Saatavuus tarkistamatta" : "Tarkistetaan saatavuutta…" : a.stale ? "Saatavuus pitää tarkistaa" : own.length ? own.map(p => p.name).join(" · ") : subscriptions.length ? subscriptions.slice(0, 2).map(p => p.name).join(" · ") : a.rent.length ? "Vuokrattavissa" : a.buy.length ? "Ostettavissa" : "Ei ilmoitettua saatavuutta"}</p>
        <div className="recommendation-actions"><button className="button secondary" disabled={isBusy} onClick={() => onAdd(title)} aria-label={`Lisää ${title.title} katsottaviin`}><Plus size={15}/>Katsottaviin</button><button className="button secondary" disabled={isBusy} onClick={() => onSeen(title)} aria-label={`${title.title}: Nähty`}><Check size={16}/>Nähty</button></div>
      </article>;
    })}</div> : !error && <Empty className="library-empty"><EmptyHeader><EmptyMedia className="empty-symbol"><Sparkles size={32}/></EmptyMedia><EmptyTitle>{data?.needsRatings ? "Tähdistä löytyvät seuraavat elokuvat" : "Suositukset on käyty läpi"}</EmptyTitle><EmptyDescription>{data?.needsRatings ? "Anna vähintään yhdelle katsotulle elokuvalle 3–5 tähteä. Suositukset tarkentuvat, kun arvioitte lisää elokuvia." : "Jo listalla olevia ja poistettuja elokuvia ei ehdoteta uudelleen. Uudet arviot tuovat lisää suosituksia."}</EmptyDescription></EmptyHeader><button className="button secondary" onClick={onViewWatched}>Arvioi katsottuja</button></Empty>}
  </section>;
}
