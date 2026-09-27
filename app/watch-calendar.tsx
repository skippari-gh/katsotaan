"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ArrowUpRight, Loader2, Star, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { PERSON, type Entry, type Person } from "@/lib/model";
import { calendarDays, formatCalendarDay, formatCalendarMonth, shiftCalendarMonth, watchDateKey, watchedMoviesByDay } from "@/lib/watch-calendar";
import Poster from "./title-poster";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Entry[];
  loading: boolean;
  error: string;
  onOpenEntry: (key: string) => void;
};

export default function WatchCalendar({ open, onOpenChange, items, loading, error, onOpenEntry }: Props) {
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="calendar-sheet" showCloseButton={false}>
      <div className="sheet-top"><div><p className="eyebrow">YHTEISET ELOKUVAILLAT</p><SheetTitle>Katselukalenteri</SheetTitle></div><SheetClose asChild><button className="icon-button" aria-label="Sulje katselukalenteri"><X/></button></SheetClose></div>
      <SheetDescription>Katsotut elokuvat päivä päivältä. Katselupäivä tallentuu automaattisesti, kun merkitset elokuvan katsotuksi.</SheetDescription>
      {open && <CalendarContents items={items} loading={loading} error={error} onOpenEntry={onOpenEntry}/>}
    </SheetContent>
  </Sheet>;
}

function CalendarContents({ items, loading, error, onOpenEntry }: Pick<Props, "items" | "loading" | "error" | "onOpenEntry">) {
  const today = watchDateKey(Date.now());
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const byDay = useMemo(() => watchedMoviesByDay(items), [items]);
  const monthDays = Object.keys(byDay).filter(day => day.startsWith(`${month}-`)).sort().reverse();
  const monthCount = monthDays.reduce((sum, day) => sum + byDay[day].length, 0);
  const shownDays = selectedDay ? (byDay[selectedDay]?.length ? [selectedDay] : []) : monthDays;
  const missingDates = items.filter(item => item.status === "watched" && item.mediaType === "movie" && item.watchedAt === null).length;
  function changeMonth(value: string) { setMonth(value); setSelectedDay(null); }

  return <div className="calendar-body" aria-busy={loading}>
    {error && <p className="calendar-error" role="alert">Kalenterin päivitys epäonnistui. {error}</p>}
    <div className="calendar-navigation">
      <button className="icon-button" aria-label="Edellinen kuukausi" onClick={() => changeMonth(shiftCalendarMonth(month, -1))}><ChevronLeft size={21}/></button>
      <h2 id="calendar-month" aria-live="polite">{formatCalendarMonth(month)}</h2>
      <button className="icon-button" aria-label="Seuraava kuukausi" onClick={() => changeMonth(shiftCalendarMonth(month, 1))}><ChevronRight size={21}/></button>
    </div>
    <div className="calendar-month-summary"><span>{loading ? "Ladataan elokuvia…" : `${monthCount} ${monthCount === 1 ? "katsottu elokuva" : "katsottua elokuvaa"}`}</span><button className="text-button" onClick={() => changeMonth(today.slice(0, 7))}>Tämä kuukausi</button></div>
    <div className="calendar-weekdays" aria-hidden="true">{["ma", "ti", "ke", "to", "pe", "la", "su"].map(day => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid" role="group" aria-labelledby="calendar-month">
      {calendarDays(month).map((day, index) => day ? <button key={day} className={`calendar-day ${byDay[day]?.length ? "has-films" : ""} ${selectedDay === day ? "selected" : ""}`} onClick={() => setSelectedDay(current => current === day ? null : day)} aria-label={`${formatCalendarDay(day)}: ${byDay[day]?.length || 0} katsottua elokuvaa`} aria-pressed={selectedDay === day} aria-current={day === today ? "date" : undefined} aria-controls="calendar-films">
        <span>{Number(day.slice(-2))}</span><span className="calendar-day-count" aria-hidden="true">{byDay[day]?.length ? <><span className="calendar-dot"/>{byDay[day].length > 1 && byDay[day].length}</> : null}</span>
      </button> : <span key={`blank-${index}`} aria-hidden="true"/>)}
    </div>
    <section id="calendar-films" className="calendar-films" aria-label="Kalenterin elokuvat">
      <div className="calendar-list-heading"><h3>{selectedDay ? formatCalendarDay(selectedDay) : "Kuukauden elokuvat"}</h3>{selectedDay && <button className="text-button" onClick={() => setSelectedDay(null)}>Näytä koko kuukausi</button>}</div>
      {loading ? <p className="calendar-empty" role="status"><Loader2 size={21} className="spin"/>Ladataan katselukalenteria…</p> : shownDays.length ? shownDays.map(day => <div className="calendar-film-day" key={day}>
        {!selectedDay && <h4><time dateTime={day}>{formatCalendarDay(day)}</time></h4>}
        {byDay[day].map(entry => <button className="calendar-film" key={entry.key} onClick={() => onOpenEntry(entry.key)} aria-label={`Avaa ${entry.title}, katsottu ${formatCalendarDay(day)}`}>
          <Poster title={entry} size="w92"/>
          <span className="calendar-film-info"><strong>{entry.title}</strong><span>{entry.year || "Vuosi ei tiedossa"}</span><span className="calendar-ratings">{(["person1", "person2"] as Person[]).map(person => <span key={person}>{PERSON[person]} <Star size={12} aria-hidden="true"/>{entry.ratings[person] ? `${entry.ratings[person]}/5` : "–"}</span>)}</span></span>
          <ArrowUpRight size={17}/>
        </button>)}
      </div>) : <div className="calendar-empty"><CalendarDays size={27} strokeWidth={1.4}/><p>{selectedDay ? "Tälle päivälle ei ole merkitty katsottuja elokuvia." : "Tässä kuussa ei ole vielä katsottuja elokuvia."}</p><p className="small-muted">Katsottu-painike lisää elokuvan kalenteriin automaattisesti.</p></div>}
    </section>
    {missingDates > 0 && <p className="small-muted">{missingDates} katsotun elokuvan päivämäärä puuttuu. Löydät ne Katsotut-listalta.</p>}
    <p className="calendar-timezone">Yhteinen kalenteri käyttää Suomen aikaa.</p>
  </div>;
}
