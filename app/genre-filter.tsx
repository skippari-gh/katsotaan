"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { genreName } from "@/lib/genres";
import type { Genre } from "@/lib/model";

export default function GenreFilter({ options, selected, onChange }: { options: Genre[]; selected: number[]; onChange: (selected: number[]) => void }) {
  const [open, setOpen] = useState(false);
  function label(id: number) { return genreName({ id, name: options.find(genre => genre.id === id)?.name || String(id) }); }
  function toggle(id: number) { onChange(selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id]); }
  return <div className="genre-filter" role="group" aria-label="Suodata genreittäin">
    <span className="genre-label">Genret</span>
    <button className="genre-chip" aria-pressed={!selected.length} onClick={() => onChange([])}>Kaikki genret</button>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button className="genre-picker">Valitse genret <ChevronDown size={15}/></button></PopoverTrigger>
      <PopoverContent className="genre-popover" align="start" aria-label="Valitse yksi tai useita genrejä">
        <div className="genre-popover-heading"><h3>Millainen tarina tänään?</h3><button className="icon-button" aria-label="Sulje genrevalinnat" onClick={() => setOpen(false)}><X size={18}/></button></div>
        <p>Valitse yksi tai useita. Mukaan tulevat teokset, joissa on jokin valituista genreistä.</p>
        <div className="genre-options" role="group" aria-label="Genret">{options.map(genre => <button className="genre-option" key={genre.id} aria-pressed={selected.includes(genre.id)} onClick={() => toggle(genre.id)}><span>{genre.name}</span>{selected.includes(genre.id) && <Check size={15}/>}</button>)}</div>
        <div className="genre-popover-footer"><button className="text-button" onClick={() => onChange([])}>Kaikki genret</button><button className="button secondary" onClick={() => setOpen(false)}>Valmis</button></div>
      </PopoverContent>
    </Popover>
    {selected.map(id => <button key={id} className="genre-chip active" aria-label={`Poista genrerajaus: ${label(id)}`} onClick={() => toggle(id)}>{label(id)}<X size={13}/></button>)}
  </div>;
}
