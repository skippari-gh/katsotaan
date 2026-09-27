"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Search, Settings2, Plus, Check, Play, X, Star, Film, Tv, ArrowUpRight, Loader2, LockKeyhole, MoreHorizontal, Trash2, MessageSquare, RefreshCw, WifiOff, ArrowRight, Sparkles, CalendarDays, Clock3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import Poster from "./title-poster";
import Recommendations from "./recommendations";
import WatchCalendar from "./watch-calendar";
import DurationFilter from "./duration-filter";
import GenreFilter from "./genre-filter";
import { formatGenres, genreOptions, matchesGenres } from "@/lib/genres";
import AddSelectionDialog, { type PendingAddition } from "./add-selection-dialog";
import { useTitleFacts } from "@/lib/use-title-facts";
import { durationLimit, fitsDuration, formatRuntime, runtimeMinutes, type DurationChoice } from "@/lib/duration";
import { formatWatchDate as shortDate, watchDateKey } from "@/lib/watch-calendar";
import { PERSON, SELECTED_BY, SELECTION_LABEL, STATUS, SERVICES, ownedProviders, posterUrl, type Person, type SelectedBy, type Status, type Title, type Entry, type Availability, type Provider } from "@/lib/model";

type Library = { items: Entry[]; services: string[]; tmdbConfigured: boolean };
function Stars({ value, onChange, label, disabled = false }: { value?: number; onChange?: (v: number) => void; label: string; disabled?: boolean }) {
  return <div className={`stars ${onChange ? "editable" : ""}`} role="group" aria-label={label}>{[1,2,3,4,5].map(n => onChange ? <button type="button" key={n} aria-label={`${label}: ${n} tähteä`} aria-pressed={n === value} disabled={disabled} onClick={() => onChange(n)} className={n <= (value || 0) ? "filled" : ""}><Star/></button> : <Star key={n} className={n <= (value || 0) ? "filled" : ""}/>)}</div>;
}
function ProviderGroup({ name, items, selected }: { name: string; items: Provider[]; selected: string[] }) {
  return <div className="provider-group"><h4>{name}</h4>{items.length ? <div className="providers">{items.map(p => <span className={`provider ${selected.some(id => SERVICES.find(s => s.id === id)?.match.test(p.name)) ? "own" : ""}`} key={p.id}>{posterUrl(p.logo, "w92") && <img src={posterUrl(p.logo, "w92")} alt="" loading="lazy"/>}{p.name}</span>)}</div> : <p className="subtle">Ei ilmoitettuja vaihtoehtoja</p>}</div>;
}

export default function Watchlist() {
  const [library, setLibrary] = useState<Library>({ items: [], services: [], tmdbConfigured: true });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  const [choosePerson, setChoosePerson] = useState(false);
  const [settings, setSettings] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tab, setTab] = useState<Status | "recommendations">("watchlist");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Title[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searchRetry, setSearchRetry] = useState(0);
  const [listQuery, setListQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [selection, setSelection] = useState<"all" | SelectedBy>("all");
  const [onlyOurs, setOnlyOurs] = useState(false);
  const [sort, setSort] = useState("newest");
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [duration, setDuration] = useState<DurationChoice>("all");
  const [customDuration, setCustomDuration] = useState("");
  const [pendingAdd, setPendingAdd] = useState<PendingAddition | null>(null);
  const titleFacts = useTitleFacts(library.items);
  const entries = useMemo(() => library.items.map(entry => ({ ...entry, runtime: entry.mediaType === "movie" ? runtimeMinutes(entry.runtime) ?? titleFacts.facts[entry.key]?.runtime ?? null : entry.runtime, genres: entry.genres ?? titleFacts.facts[entry.key]?.genres })), [library.items, titleFacts.facts]);
  const genres = useMemo(() => genreOptions(entries), [entries]);
  const [available, setAvailable] = useState<Record<string, Availability>>({});
  const [availabilityErrors, setAvailabilityErrors] = useState<string[]>([]);
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [rateKey, setRateKey] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [busy, setBusy] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const refreshSerial = useRef(0);
  const activeMutations = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    const serial = ++refreshSerial.current;
    try {
      const data = await api<Library>("/api/library");
      if (serial === refreshSerial.current) { setLibrary(data); setLoadError(""); setLoading(false); }
      return data;
    } catch (e) { if (serial === refreshSerial.current) { setLoadError((e as Error).message); setLoading(false); } throw e; }
  }, []);

  useEffect(() => {
    try { const saved = localStorage.getItem("katsotaan-person"); if (saved === "person1" || saved === "person2") setPerson(saved); else setChoosePerson(true); } catch { setChoosePerson(true); }
    const sync = () => { if (!document.hidden) void refresh().catch(() => {}); };
    sync(); const interval = setInterval(sync, 10000);
    window.addEventListener("focus", sync); window.addEventListener("online", sync); document.addEventListener("visibilitychange", sync);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { clearInterval(interval); window.removeEventListener("focus", sync); window.removeEventListener("online", sync); document.removeEventListener("visibilitychange", sync); };
  }, [refresh]);

  useEffect(() => {
    const controller = new AbortController(); const q = query.trim();
    setResults([]); setSearchError("");
    if (q.length < 2) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      api<{items: Title[]}>(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setResults(data.items); }).catch(e => { if (!controller.signal.aborted) setSearchError(e.message); }).finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 280);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, searchRetry]);

  const allKeys = library.items.map(i => i.key).sort().join(",");
  useEffect(() => {
    const controller = new AbortController();
    const keys = allKeys ? allKeys.split(",") : [];
    if (!keys.length) { setAvailabilityLoading(false); return; }
    setAvailabilityLoading(true); setAvailabilityErrors([]);
    void (async () => {
      for (let i = 0; i < keys.length; i += 8) {
        if (controller.signal.aborted) return;
        const batch = keys.slice(i, i + 8);
        try {
          const data = await api<{items: Record<string, Availability>; errors: string[]}>(`/api/availability?keys=${encodeURIComponent(batch.join(","))}`, { signal: controller.signal });
          if (controller.signal.aborted) return;
          setAvailable(prev => ({ ...prev, ...data.items })); setAvailabilityErrors(prev => [...prev, ...data.errors]);
        } catch { if (!controller.signal.aborted) setAvailabilityErrors(prev => [...prev, ...batch]); }
      }
      if (!controller.signal.aborted) setAvailabilityLoading(false);
    })();
    return () => controller.abort();
  }, [allKeys, availabilityRetry]);
  useEffect(() => { const id = setInterval(() => { if (!document.hidden) setAvailabilityRetry(v => v + 1); }, 3600000); return () => clearInterval(id); }, []);

  function selectPerson(p: Person) { setPerson(p); try { localStorage.setItem("katsotaan-person", p); } catch {} setChoosePerson(false); }
  async function mutate(id: string, action: () => Promise<unknown>) {
    if (activeMutations.current.has(id)) return false;
    activeMutations.current.add(id); setBusy([...activeMutations.current]); ++refreshSerial.current;
    try { await action(); await refresh(); return true; }
    catch (e) { toast.error((e as Error).message); return false; }
    finally { activeMutations.current.delete(id); setBusy([...activeMutations.current]); }
  }
  function add(title: Title) {
    if (!person) { setChoosePerson(true); return; }
    setPendingAdd({ title, status: "watchlist" });
  }
  function seenRecommendation(title: Title) {
    if (!person) { setChoosePerson(true); return; }
    setPendingAdd({ title, status: "watched" });
  }
  async function confirmAddition(selectedBy: SelectedBy) {
    if (!pendingAdd || !person) return;
    const { title, status } = pendingAdd;
    let added = false;
    const ok = await mutate(title.key, async () => {
      const data = await api<{ added: boolean }>("/api/library", { method: "POST", body: JSON.stringify({ tmdbId: title.tmdbId, mediaType: title.mediaType, person, selectedBy, status }) });
      added = data.added;
    });
    if (ok) {
      setPendingAdd(null);
      toast.success(status === "watched" ? `${title.title} siirretty katsottuihin` : added ? `${title.title} lisätty katsottaviin` : "Teos on jo yhteisellä listalla.");
      if (status === "watched") setRateKey(title.key);
    }
  }
  async function updateStatus(entry: Entry, status: Status) {
    if (await mutate(entry.key, () => api(`/api/library/${encodeURIComponent(entry.key)}`, { method: "PATCH", body: JSON.stringify({ status }) }))) {
      toast.success(status === "watched" ? `${entry.title} merkitty katsotuksi` : `Siirretty: ${STATUS[status]}`);
      if (status === "watched") { if (person) setRateKey(entry.key); else setChoosePerson(true); }
    }
  }
  async function rate(entry: Entry, rating: number | null) {
    if (!person) { setChoosePerson(true); return false; }
    return await mutate(`rate:${entry.key}`, () => api(`/api/library/${encodeURIComponent(entry.key)}`, { method: "PATCH", body: JSON.stringify({ person, rating }) }));
  }
  async function updateSelection(entry: Entry, selectedBy: SelectedBy) {
    if (await mutate(`selection:${entry.key}`, () => api(`/api/library/${encodeURIComponent(entry.key)}`, { method: "PATCH", body: JSON.stringify({ selectedBy }) }))) toast.success("Valitsija tallennettu");
  }
  async function service(id: string, enabled: boolean) {
    await mutate(`service:${id}`, () => api("/api/services", { method: "PATCH", body: JSON.stringify({ id, enabled }) }));
  }

  // WebMCP exposes the same search and library state; it is optional in unsupported browsers.
  useEffect(() => {
    const context = (document as any).modelContext; if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const definitions = [
      { name: "read_shared_watchlist", title: "Lue yhteinen katselulista", description: "Read the shared list, including selectors, shared statuses, notes and ratings.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async (input: unknown) => { if (!input || typeof input !== "object" || Object.keys(input).length) throw new Error("No arguments accepted"); const data = await refresh(); return { items: data.items }; } },
      { name: "search_movies_and_series", title: "Hae elokuvia ja sarjoja", description: "Search TMDB and show the results in the visible search field. Does not add anything to the list.", inputSchema: { type: "object", properties: { query: { type: "string", minLength: 2, maxLength: 150 } }, required: ["query"], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async (input: any) => { if (!input || typeof input.query !== "string" || input.query.trim().length < 2 || input.query.length > 150 || Object.keys(input).length !== 1) throw new Error("A query of 2–150 characters is required"); const data = await api<{items: Title[]}>(`/api/search?q=${encodeURIComponent(input.query.trim())}`); setQuery(input.query.trim()); setResults(data.items); await new Promise<void>(r => requestAnimationFrame(() => r())); return data; } },
    ];
    for (const tool of definitions) try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {}
    return () => lifecycle.abort();
  }, [refresh]);

  const counts = { watchlist: 0, watching: 0, watched: 0 }; library.items.forEach(i => counts[i.status]++);
  const timeLimit = tab === "watchlist" && kind !== "tv" ? durationLimit(duration, customDuration) : null;
  const missingRuntimeCount = entries.filter(entry => entry.status === "watchlist" && entry.mediaType === "movie" && runtimeMinutes(entry.runtime) === null).length;
  const visible = useMemo(() => entries.filter(i => i.status === tab && fitsDuration(i, timeLimit) && matchesGenres(i.genres, selectedGenres) && (kind === "all" || i.mediaType === kind) && (selection === "all" || i.selectedBy === selection) && `${i.title} ${i.originalTitle}`.toLocaleLowerCase("fi").includes(listQuery.toLocaleLowerCase("fi")) && (!onlyOurs || ownedProviders(available[i.key], library.services).length > 0)).sort((a, b) => sort === "oldest" ? a.createdAt - b.createdAt : sort === "year" ? (b.year || 0) - (a.year || 0) : sort === "score" ? b.score - a.score : b.createdAt - a.createdAt), [entries, library.services, tab, kind, selection, listQuery, onlyOurs, available, sort, timeLimit, selectedGenres]);
  const missingGenreCount = entries.filter(entry => entry.status === tab && (kind === "all" || entry.mediaType === kind) && !entry.genres?.length).length;
  const selected = entries.find(i => i.key === selectedKey);
  const ratingEntry = library.items.find(i => i.key === rateKey);
  const deletion = library.items.find(i => i.key === deleteKey);
  const filtered = kind !== "all" || selection !== "all" || onlyOurs || Boolean(listQuery) || timeLimit !== null || selectedGenres.length > 0;

  return <>
    <div className="app-shell">
      <header className="site-header">
        <a href="/" className="brand" aria-label="Katsotaan etusivu"><span className="brand-mark"><Play fill="currentColor" size={16}/></span>katsotaan<span className="brand-dot">.</span></a>
        <div className="header-right"><span className="shared-caption"><LockKeyhole size={13}/> Meidän kahden lista</span><button className="profile-control" onClick={() => setChoosePerson(true)} aria-label="Vaihda tämän laitteen käyttäjä"><span className={`avatar ${person === "person2" ? "second" : ""}`}>{person ? PERSON[person][0] : "?"}</span><span className="profile-label">{person ? PERSON[person] : "Valitse käyttäjä"}</span></button><button className="icon-button calendar-open" onClick={() => setCalendarOpen(true)} aria-label="Avaa katselukalenteri" title="Katselukalenteri"><CalendarDays size={21}/></button><button className="icon-button" onClick={() => setSettings(true)} aria-label="Asetukset"><Settings2 size={21}/></button></div>
      </header>

      <main>
        <section className="search-section" aria-label="Lisää katsottavaa">
          <div className="eyebrow">YHTEINEN KATSELULISTA</div>
          <h1><label htmlFor="title-search">Mitä haluaisit katsoa<span>?</span></label></h1>
          <div className={`main-search ${query ? "has-query" : ""}`}><Search size={23}/><input id="title-search" ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} maxLength={150} placeholder="Etsi elokuvaa tai sarjaa…" autoComplete="off" spellCheck={false} aria-controls="search-results"/>{query && <button className="icon-button" aria-label="Tyhjennä haku" onClick={() => { setQuery(""); inputRef.current?.focus(); }}><X size={19}/></button>}<span className="search-source">TMDB</span></div>
          <p className="search-hint">Se seuraava hyvä elokuva. Tai sarja, josta kaikki puhuvat.</p>
          {query.trim().length >= 2 && <section id="search-results" className="search-results" aria-label="Hakutulokset" aria-busy={searching}>
            <div className="result-heading"><span>{searching ? "Etsitään katsottavaa…" : searchError ? "Haku ei ole käytettävissä" : `${results.length} hakutulosta`}</span>{searching && <Loader2 className="spin" size={17}/>}</div>
            {searchError ? <div className="search-error" role="alert"><p>{searchError}</p>{!library.tmdbConfigured ? <button className="text-button" onClick={() => setSettings(true)}>Avaa käyttöönotto <ArrowRight size={15}/></button> : <button className="text-button" onClick={() => setSearchRetry(v => v + 1)}>Yritä uudelleen</button>}</div> : !searching && !results.length ? <p className="search-error">Ei osumia. Kokeile alkuperäistä nimeä tai lyhyempää hakusanaa.</p> : results.map(title => { const saved = library.items.find(i => i.key === title.key); return <div className="result-row" key={title.key}><Poster title={title} size="w92"/><div className="result-info"><h3>{title.title}</h3><p>{title.year || "Vuosi ei tiedossa"}<span>·</span>{title.mediaType === "tv" ? "Sarja" : "Elokuva"}{title.originalTitle && title.originalTitle !== title.title && <span className="original-result"> · {title.originalTitle}</span>}</p></div><button className={`add-button ${saved ? "is-added" : ""}`} disabled={Boolean(saved) || busy.includes(title.key)} onClick={() => add(title)} aria-label={saved ? `${title.title} on jo listalla` : `Lisää ${title.title} katsottaviin`}>{busy.includes(title.key) ? <Loader2 className="spin" size={18}/> : saved ? <Check size={18}/> : <Plus size={19}/>}<span>{saved ? STATUS[saved.status] : "Lisää katsottaviin"}</span></button></div>; })}
          </section>}
        </section>

        {!loading && !library.tmdbConfigured && <div className="connection-notice"><span className="notice-icon"><Film size={19}/></span><div><strong>Vielä yksi asia ennen ensimmäistä elokuvailtaa</strong><p>Elokuvahaku avautuu, kun TMDB-avain on liitetty.</p></div><button onClick={() => setSettings(true)} className="text-button">Käyttöönotto <ArrowUpRight size={16}/></button></div>}
        {loadError && <div className="sync-error" role="alert"><WifiOff size={19}/><p>{loadError}</p><button onClick={() => refresh().catch(() => {})} className="text-button">Yritä uudelleen</button></div>}

        <Tabs value={tab} onValueChange={v => setTab(v as Status | "recommendations")} className="library-tabs">
          <div className="tab-row"><TabsList variant="line" className="main-tabs">{(Object.keys(STATUS) as Status[]).map(s => <TabsTrigger value={s} key={s}>{s === "watchlist" ? <Bookmark/> : s === "watching" ? <Play/> : <Check/>}{STATUS[s]}<span className="tab-count">{loading ? "–" : counts[s]}</span></TabsTrigger>)}<TabsTrigger value="recommendations"><Sparkles/>Suositukset</TabsTrigger></TabsList><span className="library-total">{library.items.length} teosta yhdessä</span></div>
          {tab !== "recommendations" && <>
          <div className="filter-row"><Tabs value={kind} onValueChange={setKind}><TabsList className="type-tabs" aria-label="Teoksen tyyppi"><TabsTrigger value="all">Kaikki</TabsTrigger><TabsTrigger value="movie">Elokuvat</TabsTrigger><TabsTrigger value="tv">Sarjat</TabsTrigger></TabsList></Tabs><label className="ours-filter"><Checkbox checked={onlyOurs} onCheckedChange={v => setOnlyOurs(v === true)}/>Vain omissa palveluissamme</label><div className="filter-right"><div className="list-search"><Search size={16}/><input aria-label="Hae omalta listalta" placeholder="Hae listalta" value={listQuery} onChange={e => setListQuery(e.target.value)}/></div><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Järjestä lista" className="sort-select"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="newest">Viimeksi lisätyt</SelectItem><SelectItem value="oldest">Vanhimmat lisäykset</SelectItem><SelectItem value="year">Julkaisuvuosi</SelectItem><SelectItem value="score">TMDB-arvosana</SelectItem></SelectContent></Select></div></div>
          <div className="selection-filter"><span>Valinnat</span><Tabs value={selection} onValueChange={v => setSelection(v as "all" | SelectedBy)}><TabsList className="type-tabs selection-tabs" aria-label="Suodata valitsijan mukaan"><TabsTrigger value="all">Kaikki</TabsTrigger><TabsTrigger value="person1">{PERSON.person1}</TabsTrigger><TabsTrigger value="person2">{PERSON.person2}</TabsTrigger><TabsTrigger value="both">Molemmat</TabsTrigger></TabsList></Tabs></div>
          <GenreFilter options={genres} selected={selectedGenres} onChange={setSelectedGenres}/>
          {selectedGenres.length > 0 && titleFacts.loading && <p className="filter-info" role="status"><Loader2 size={14} className="spin"/>Haetaan puuttuvia genretietoja…</p>}
          {selectedGenres.length > 0 && !titleFacts.loading && missingGenreCount > 0 && <p className="filter-info">{missingGenreCount} teoksen genret puuttuvat. Ne eivät näy genrerajauksessa. <button className="inline-link" onClick={titleFacts.retry}>Tarkista tiedot uudelleen</button></p>}
          {tab === "watchlist" && kind !== "tv" && <DurationFilter value={duration} custom={customDuration} onChange={setDuration} onCustomChange={setCustomDuration}/>}
          {timeLimit !== null && titleFacts.loading && <p className="filter-info" role="status"><Loader2 size={14} className="spin"/>Haetaan puuttuvia kestoja…</p>}
          {timeLimit !== null && !titleFacts.loading && missingRuntimeCount > 0 && <p className="filter-info">{missingRuntimeCount} elokuvan kesto puuttuu. Ne eivät näy aikarajatussa listassa. <button className="inline-link" onClick={titleFacts.retry}>Tarkista kestot uudelleen</button></p>}
          {onlyOurs && !library.services.length && <p className="filter-info">Valitse ensin yhteiset suoratoistopalvelunne <button className="inline-link" onClick={() => setSettings(true)}>asetuksissa</button>.</p>}
          {onlyOurs && availabilityLoading && <p className="filter-info"><Loader2 size={14} className="spin"/> Tarkistetaan Suomen katseluvaihtoehtoja…</p>}
          {availabilityErrors.length > 0 && <p className="filter-info">Kaikkien teosten saatavuutta ei saatu tarkistettua. {onlyOurs && "Ne voivat puuttua suodatetulta listalta."} <button className="inline-link" onClick={() => setAvailabilityRetry(v => v + 1)}>Yritä uudelleen</button></p>}
          </>}
          {(Object.keys(STATUS) as Status[]).map(s => <TabsContent value={s} key={s} className="library-content">
            {s === "watched" && <div className="watched-calendar-link"><button className="text-button" onClick={() => setCalendarOpen(true)}><CalendarDays size={17}/>Avaa katselukalenteri</button></div>}
            {loading ? <div className="poster-grid" aria-label="Ladataan yhteistä listaa">{[1,2,3,4,5].map(n => <div key={n}><Skeleton className="poster-skeleton"/><Skeleton className="title-skeleton"/></div>)}</div> : visible.length ? <div className="poster-grid">{visible.map(entry => {
              const a = available[entry.key]; const ours = ownedProviders(a, library.services); const subscription = a ? [...a.subscription, ...a.free] : [];
              return <article className="title-card" key={entry.key}><button className="poster-button" onClick={() => setSelectedKey(entry.key)} aria-label={`Avaa ${entry.title}`}><Poster title={entry}/><span className="poster-shade"/>{entry.votes > 0 && <span className="score"><Star size={12} fill="currentColor"/>{entry.score.toFixed(1)}</span>}{ours.length > 0 && <span className="own-badge"><Check size={13}/> Meidän palvelussa</span>}<span className="poster-open">Avaa tiedot <ArrowUpRight size={16}/></span></button><div className="card-heading"><button onClick={() => setSelectedKey(entry.key)}>{entry.title}</button><DropdownMenu><DropdownMenuTrigger asChild><button className="icon-button card-menu" aria-label={`${entry.title}: lisää toimintoja`}><MoreHorizontal size={20}/></button></DropdownMenuTrigger><DropdownMenuContent align="end">{(Object.keys(STATUS) as Status[]).filter(v => v !== entry.status).map(v => <DropdownMenuItem key={v} disabled={busy.includes(entry.key)} onClick={() => updateStatus(entry, v)}>{STATUS[v]}</DropdownMenuItem>)}<DropdownMenuSeparator/><DropdownMenuItem onClick={() => setDeleteKey(entry.key)} className="text-destructive"><Trash2 size={15}/>Poista listalta</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><p className="card-meta">{entry.year || "–"}<span>·</span>{entry.mediaType === "movie" ? "Elokuva" : "Sarja"}{entry.note && <MessageSquare size={12} aria-label="Muistiinpano"/>}</p>{entry.mediaType === "movie" && <p className="card-runtime"><Clock3 size={13}/>{formatRuntime(entry.runtime)}</p>}<p className="card-genres">{entry.genres === undefined && titleFacts.loading ? "Haetaan genrejä…" : formatGenres(entry.genres)}</p><Select value={entry.selectedBy} onValueChange={value => updateSelection(entry, value as SelectedBy)} disabled={busy.includes(`selection:${entry.key}`)}><SelectTrigger className="selection-tag selection-card-control" aria-label={`Muuta valitsijaa: ${entry.title}`}><SelectValue>{SELECTION_LABEL[entry.selectedBy]}</SelectValue></SelectTrigger><SelectContent>{(Object.keys(SELECTED_BY) as SelectedBy[]).map(value => <SelectItem key={value} value={value}>{SELECTED_BY[value]}</SelectItem>)}</SelectContent></Select><p className={`card-provider ${ours.length ? "is-ours" : ""}`}>{!a ? availabilityErrors.includes(entry.key) ? "Saatavuus tarkistamatta" : "Tarkistetaan saatavuutta…" : a.stale ? "Saatavuus pitää tarkistaa" : ours.length ? ours.map(p => p.name).join(" · ") : subscription.length ? subscription.slice(0, 2).map(p => p.name).join(" · ") : a.rent.length ? "Vuokrattavissa" : a.buy.length ? "Ostettavissa" : "Ei ilmoitettua saatavuutta"}</p>{entry.status !== "watched" ? <div className="card-actions">{entry.status === "watchlist" && <button onClick={() => updateStatus(entry, "watching")} disabled={busy.includes(entry.key)} aria-label={`Aloita ${entry.title}`}><Play size={13}/>Aloita</button>}<button onClick={() => updateStatus(entry, "watched")} disabled={busy.includes(entry.key)} aria-label={`Merkitse ${entry.title} katsotuksi`}><Check size={15}/>Katsottu</button></div> : <div className="card-ratings">{(["person1", "person2"] as Person[]).map(p => <span key={p} title={`${PERSON[p]}: ${entry.ratings[p] || "ei arviota"}`}><span>{PERSON[p][0]}</span><Star size={12}/>{entry.ratings[p] || "–"}</span>)}<button className="inline-link" onClick={() => setSelectedKey(entry.key)}>Arviot</button></div>}{entry.status === "watched" && entry.watchedAt !== null && <p className="watched-date"><CalendarDays size={13}/><time dateTime={watchDateKey(entry.watchedAt)}>Katsottu {shortDate(entry.watchedAt)}</time></p>}<p className="added-by">{PERSON[entry.addedBy]} lisäsi · {shortDate(entry.createdAt)}</p></article>;
            })}</div> : <Empty className="library-empty"><EmptyHeader><EmptyMedia className="empty-symbol">{s === "watchlist" ? <Bookmark size={34} strokeWidth={1.25}/> : s === "watching" ? <Play size={34} strokeWidth={1.25}/> : <Check size={34} strokeWidth={1.25}/>}</EmptyMedia><EmptyTitle>{filtered ? "Näillä valinnoilla ei löytynyt katsottavaa" : s === "watchlist" ? "Hyvät vinkit ansaitsevat oman paikan." : s === "watching" ? "Mitä katsotaan seuraavaksi?" : "Tänne jäävät yhteiset elokuvaillat."}</EmptyTitle><EmptyDescription>{filtered ? "Kokeile toista hakusanaa tai poista suodattimia." : s === "watchlist" ? "Lisää ensimmäinen elokuva tai sarja yllä olevalla haulla. Se odottaa täällä seuraavaa vapaata iltaa." : s === "watching" ? "Paina teoksen Aloita-painiketta, niin se löytyy täältä." : "Kun merkitsette teoksen katsotuksi, se siirtyy tänne. Voitte antaa sille myös omat tähtenne."}</EmptyDescription></EmptyHeader>{filtered ? <button className="button secondary" onClick={() => { setKind("all"); setSelection("all"); setOnlyOurs(false); setListQuery(""); setDuration("all"); setCustomDuration(""); setSelectedGenres([]); }}>Tyhjennä suodattimet</button> : s === "watchlist" ? <button className="button primary" onClick={() => { inputRef.current?.focus(); inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}><Plus size={18}/>Etsi ensimmäinen teos</button> : <button className="button secondary" onClick={() => setTab("watchlist")}>Avaa katsottavat <ArrowRight size={17}/></button>}</Empty>}
          </TabsContent>)}
          <TabsContent value="recommendations" className="library-content"><Recommendations library={library.items} services={library.services} person={person} busy={busy} onAdd={add} onSeen={seenRecommendation} onNeedPerson={() => setChoosePerson(true)} onViewWatched={() => setTab("watched")}/></TabsContent>
        </Tabs>
      </main>
      <footer className="site-footer"><span><LockKeyhole size={13}/> Vain meille kahdelle.</span><button onClick={() => setSettings(true)}>Elokuvatiedot: TMDB <span>·</span> Saatavuus: JustWatch</button><span>Tehdään tilaa hyvälle tarinalle.</span></footer>
    </div>

    <AddSelectionDialog pending={pendingAdd} busy={Boolean(pendingAdd && busy.includes(pendingAdd.title.key))} onCancel={() => setPendingAdd(null)} onChoose={confirmAddition}/>

    <WatchCalendar open={calendarOpen} onOpenChange={setCalendarOpen} items={library.items} loading={loading} error={loadError} onOpenEntry={key => { setCalendarOpen(false); setSelectedKey(key); }}/>

    <Dialog open={choosePerson} onOpenChange={setChoosePerson}><DialogContent className="profile-dialog" showCloseButton={Boolean(person)} onInteractOutside={e => { if (!person) e.preventDefault(); }} onEscapeKeyDown={e => { if (!person) e.preventDefault(); }}><div className="dialog-logo"><Play size={21} fill="currentColor"/></div><DialogTitle>Kumpi siellä katselee?</DialogTitle><DialogDescription>Yksi yhteinen lista, kahden omat tähdet.<br/>Valinta muistetaan tällä laitteella.</DialogDescription><div className="profile-choices">{(["person1", "person2"] as Person[]).map(p => <button key={p} onClick={() => selectPerson(p)}><span className={`large-avatar ${p === "person2" ? "second" : ""}`}>{PERSON[p][0]}</span><strong>{PERSON[p]}</strong>{person === p && <small>Nykyinen käyttäjä</small>}</button>)}</div></DialogContent></Dialog>

    <Sheet open={settings} onOpenChange={setSettings}><SheetContent className="settings-sheet" showCloseButton={false}><div className="sheet-top"><div><p className="eyebrow">KATSOTAAN</p><SheetTitle>Meidän asetukset</SheetTitle></div><SheetClose asChild><button className="icon-button" aria-label="Sulje asetukset"><X/></button></SheetClose></div><SheetDescription>Palveluvalinnat ovat yhteiset molemmille.</SheetDescription><section className="settings-section"><h3>Omat suoratoistopalvelut</h3><p>Valitse käytössä olevat palvelut. Niistä löytyvät teokset erottuvat listalla.</p><div className="service-settings">{SERVICES.map(s => <label className={`service-option ${library.services.includes(s.id) ? "selected" : ""}`} key={s.id}><span className="service-monogram" style={{ color: s.color }}>{s.short}</span><span>{s.name}</span><Checkbox aria-label={s.name} checked={library.services.includes(s.id)} disabled={busy.includes(`service:${s.id}`) || loading || Boolean(loadError)} onCheckedChange={v => service(s.id, v === true)}/></label>)}</div><p className="small-muted">Valinnat tallentuvat heti molemmille. Ilmaiset palvelut voi valita mukaan.</p></section><section className="settings-section"><h3>Tämä laite</h3><div className="settings-line"><span>Käyttäjä: <strong>{person ? PERSON[person] : "Ei valittu"}</strong></span><button className="text-button" onClick={() => { setSettings(false); setChoosePerson(true); }}>Vaihda käyttäjää</button></div><p>iPhonessa voit lisätä Katsotaan-palvelun kotinäytölle Safarin Jaa-valikon kautta.</p></section><section className="settings-section"><h3>Yksityinen yhteinen lista</h3><p>Pääsy on rajattu tämän palvelun yhteisellä salasanalla. Käyttäjävalinta määrittää lisäysten ja arvioiden nimen.</p><button className="button secondary" onClick={async () => { try { await api("/api/auth/logout", { method: "POST", body: "{}" }); window.location.assign("/login"); } catch (e) { toast.error((e as Error).message); } }}>Kirjaudu ulos</button></section><section className="settings-section"><h3>Elokuvahaku</h3>{library.tmdbConfigured ? <p className="connection-ready"><Check size={17}/> TMDB-yhteys on määritetty.</p> : <><p>Haku ja katseluvaihtoehdot tarvitsevat TMDB:n API-avaimen.</p><ol className="setup-steps"><li>Avaa <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">TMDB:n API-asetukset <ArrowUpRight size={13}/></a> ja luo tarvittaessa tili.</li><li>Ota henkilökohtainen API-käyttö käyttöön.</li><li>Liitä <strong>API Read Access Token</strong> palvelimen .env-tiedostoon nimellä <code>TMDB_API_READ_ACCESS_TOKEN</code> ja käynnistä palvelu uudelleen.</li></ol><p className="small-muted">Avain kuuluu vain palvelimen asetuksiin.</p></>}</section><section className="settings-section credits"><h3>Tiedot ja saatavuus</h3><a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer"><img src="/tmdb.svg" alt="TMDB" width="100" height="14" className="tmdb-logo"/></a><p>Elokuvien ja sarjojen tiedot sekä julisteet: <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">TMDB</a>. Suomen katseluvaihtoehdot: <a href="https://www.justwatch.com/fi" target="_blank" rel="noopener noreferrer">JustWatch</a>, TMDB:n kautta.</p><p>Saatavuus tarkistetaan enintään kuuden tunnin välein. Palvelujen valikoimat voivat muuttua, eivätkä kaikki Suomen palvelut ole aina mukana lähdetiedoissa.</p><p className="small-muted">This product uses the TMDB API but is not endorsed or certified by TMDB.</p></section></SheetContent></Sheet>

    <Sheet open={Boolean(selected)} onOpenChange={open => { if (!open) setSelectedKey(null); }}><SheetContent className="detail-sheet" showCloseButton={false}>{selected && <Detail key={selected.key} entry={selected} availability={available[selected.key]} availabilityError={availabilityErrors.includes(selected.key)} services={library.services} person={person} busy={busy} onStatus={s => updateStatus(selected, s)} onSelection={v => updateSelection(selected, v)} onRate={v => rate(selected, v)} onNote={async (note, noteVersion) => mutate(`note:${selected.key}`, () => api(`/api/library/${encodeURIComponent(selected.key)}`, { method: "PATCH", body: JSON.stringify({ note, noteVersion }) }))} onRefresh={() => setAvailabilityRetry(v => v + 1)} onDelete={() => setDeleteKey(selected.key)}/>}</SheetContent></Sheet>

    <Dialog open={Boolean(ratingEntry)} onOpenChange={open => { if (!open) setRateKey(null); }}><DialogContent className="rating-dialog"><DialogTitle>Mitä pidit?</DialogTitle><DialogDescription>{ratingEntry?.title} on nyt katsotuissa.{ratingEntry?.watchedAt != null && <> Katselupäivä: {shortDate(ratingEntry.watchedAt)}.</>} Arvion voi antaa myöhemminkin.</DialogDescription><span className="eyebrow">{person ? PERSON[person] : "Oma arvio"}</span><Stars label="Oma arvosana" value={person && ratingEntry ? ratingEntry.ratings[person] : undefined} disabled={busy.includes(`rate:${rateKey}`)} onChange={async v => { if (ratingEntry && await rate(ratingEntry, v)) { setRateKey(null); toast.success("Arviosi tallennettu"); } }}/><DialogClose asChild><button className="button secondary">Ohita tällä kertaa</button></DialogClose></DialogContent></Dialog>

    <AlertDialog open={Boolean(deletion)} onOpenChange={open => { if (!open) setDeleteKey(null); }}><AlertDialogContent><AlertDialogTitle>Poistetaanko {deletion?.title}?</AlertDialogTitle><AlertDialogDescription>Teos, yhteinen muistiinpano ja molempien arviot poistuvat listalta.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Peruuta</AlertDialogCancel><AlertDialogAction className="danger-button" onClick={async () => { if (deletion && await mutate(deletion.key, () => api(`/api/library/${encodeURIComponent(deletion.key)}`, { method: "DELETE", body: "{}" }))) { setDeleteKey(null); setSelectedKey(null); toast.success("Teos poistettu listalta"); } }}>Poista listalta</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Toaster position="bottom-center" theme="dark" richColors/>
  </>;
}

function Detail({ entry, availability: a, availabilityError, services, person, busy, onStatus, onSelection, onRate, onNote, onRefresh, onDelete }: { entry: Entry; availability?: Availability; availabilityError: boolean; services: string[]; person: Person | null; busy: string[]; onStatus: (s: Status) => void; onSelection: (v: SelectedBy) => void; onRate: (v: number | null) => Promise<boolean>; onNote: (note: string, version: number) => Promise<boolean>; onRefresh: () => void; onDelete: () => void }) {
  const [note, setNote] = useState(entry.note); const [version, setVersion] = useState(entry.noteVersion); const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) { setNote(entry.note); setVersion(entry.noteVersion); } }, [entry.note, entry.noteVersion, dirty]);
  const own = ownedProviders(a, services);
  return <><div className="detail-visual">{posterUrl(entry.backdrop, "w780") && <img className="detail-backdrop" src={posterUrl(entry.backdrop, "w780")} alt=""/>}<div className="detail-gradient"/><SheetClose asChild><button className="icon-button close-detail" aria-label="Sulje teoksen tiedot"><X/></button></SheetClose><div className="detail-intro"><Poster title={entry} className="detail-poster"/><div><p className="eyebrow">{entry.mediaType === "movie" ? "ELOKUVA" : "SARJA"} · {entry.year || "–"}</p><SheetTitle>{entry.title}</SheetTitle><SheetDescription>{entry.originalTitle !== entry.title ? entry.originalTitle : `${entry.mediaType === "movie" ? "Elokuva" : "TV-sarja"} · ${entry.year || "Julkaisuvuosi ei tiedossa"}`}</SheetDescription><div className="detail-meta">{entry.votes > 0 && <span><Star size={15} fill="currentColor"/> {entry.score.toFixed(1)} <small>TMDB</small></span>}{entry.runtime && <span>{formatRuntime(entry.runtime)}</span>}</div></div></div></div><div className="detail-body"><div className="detail-status"><Select value={entry.status} onValueChange={v => onStatus(v as Status)} disabled={busy.includes(entry.key)}><SelectTrigger aria-label="Teoksen tila"><SelectValue/></SelectTrigger><SelectContent>{(Object.keys(STATUS) as Status[]).map(s => <SelectItem value={s} key={s}>{STATUS[s]}</SelectItem>)}</SelectContent></Select>{entry.status !== "watched" && <button className="button primary" disabled={busy.includes(entry.key)} onClick={() => onStatus("watched")}><Check size={18}/>Katsottu</button>}</div><div className="selection-control"><label htmlFor="selected-by">Kenen valinta?</label><Select value={entry.selectedBy} onValueChange={v => onSelection(v as SelectedBy)} disabled={busy.includes(`selection:${entry.key}`)}><SelectTrigger id="selected-by" aria-label="Kenen valinta"><SelectValue/></SelectTrigger><SelectContent>{(Object.keys(SELECTED_BY) as SelectedBy[]).map(v => <SelectItem value={v} key={v}>{SELECTED_BY[v]}</SelectItem>)}</SelectContent></Select></div><p className="detail-genres">{formatGenres(entry.genres)}</p><p className="overview">{entry.overview || "Tälle teokselle ei ole vielä kuvausta."}</p><section className="detail-section"><div className="section-heading"><h3>Missä katsotaan?</h3><span className="country-badge">Suomi</span></div>{!a ? <p className="subtle">{availabilityError ? <>Saatavuutta ei saatu tarkistettua. <button className="inline-link" onClick={onRefresh}>Yritä uudelleen</button></> : "Tarkistetaan katseluvaihtoehtoja…"}</p> : <>{own.length > 0 && !a.stale && <div className="own-highlight"><Check size={18}/><span>Löytyy meidän palvelusta: <strong>{own.map(p => p.name).join(", ")}</strong></span></div>}{a.stale && <p className="stale-notice">Nämä ovat aiemmin haettuja tietoja. Tarkista ajantasainen saatavuus linkistä.</p>}<ProviderGroup name="Sisältyy tilaukseen" items={a.subscription} selected={services}/>{a.free.length > 0 && <ProviderGroup name="Maksutta / mainoksilla" items={a.free} selected={services}/>}<ProviderGroup name="Vuokrattavissa" items={a.rent} selected={[]}/><ProviderGroup name="Ostettavissa" items={a.buy} selected={[]}/><p className="availability-date">Tarkistettu {shortDate(a.checkedAt)} · JustWatch / TMDB</p></>}<a className="button secondary external-link" href={a?.link || `https://www.justwatch.com/fi/etsi?q=${encodeURIComponent(entry.title)}`} target="_blank" rel="noopener noreferrer">Tarkista katseluvaihtoehdot <ArrowUpRight size={17}/></a></section><section className="detail-section"><h3>Meidän tähdet</h3>{(["person1", "person2"] as Person[]).map(p => <div className="rating-line" key={p}><span className={`avatar ${p === "person2" ? "second" : ""}`}>{PERSON[p][0]}</span><span>{PERSON[p]}{p === person && <small> · sinä</small>}</span><Stars label={`${PERSON[p]}: arvosana`} value={entry.ratings[p]} disabled={busy.includes(`rate:${entry.key}`)} onChange={p === person ? v => { void onRate(v); } : undefined}/></div>)}{person && entry.ratings[person] && <button className="inline-link muted-link" onClick={() => onRate(null)}>Poista oma arvioni</button>}</section><section className="detail-section"><label className="section-label" htmlFor="shared-note">Yhteinen muistiinpano</label><textarea id="shared-note" value={note} onChange={e => { setNote(e.target.value); setDirty(true); }} maxLength={1000} placeholder="Kuka suositteli? Milloin katsottaisiin?" rows={3}/><div className="note-bottom"><span>{note.length}/1000</span><button className="button secondary" disabled={!dirty || busy.includes(`note:${entry.key}`)} onClick={async () => { if (await onNote(note, version)) { setDirty(false); toast.success("Muistiinpano tallennettu"); } }}>Tallenna muistiinpano</button></div>{dirty && version !== entry.noteVersion && <p className="stale-notice">Toinen teistä päivitti muistiinpanoa. Oma tekstisi säilyy tässä. <button className="inline-link" onClick={() => { setNote(entry.note); setVersion(entry.noteVersion); setDirty(false); }}>Lataa uusin teksti</button></p>}</section><div className="detail-bottom"><p>Lisäsi: {PERSON[entry.addedBy]} · {shortDate(entry.createdAt)}{entry.watchedAt && <><br/>Katsottu {shortDate(entry.watchedAt)}</>}</p><button className="icon-button delete-button" aria-label="Poista teos listalta" onClick={onDelete}><Trash2 size={18}/></button></div></div></>;
}
