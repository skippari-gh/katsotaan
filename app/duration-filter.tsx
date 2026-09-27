"use client";

import { Clock3 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DURATION_OPTIONS, durationLimit, type DurationChoice } from "@/lib/duration";

export default function DurationFilter({ value, custom, onChange, onCustomChange }: {
  value: DurationChoice; custom: string; onChange: (choice: DurationChoice) => void; onCustomChange: (value: string) => void;
}) {
  const invalid = value === "custom" && durationLimit(value, custom) === null;
  return <div className="duration-filter">
    <label htmlFor="duration-choice"><Clock3 size={16}/>Paljonko on aikaa?</label>
    <Select value={value} onValueChange={next => onChange(next as DurationChoice)}><SelectTrigger id="duration-choice" className="duration-select"><SelectValue/></SelectTrigger><SelectContent>{DURATION_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
    {value === "custom" && <label className="custom-duration"><span className="sr-only">Oma aika minuutteina</span><input type="number" inputMode="numeric" min="1" max="9999" step="1" placeholder="Esim. 105" value={custom} onChange={event => onCustomChange(event.target.value)} aria-invalid={invalid} aria-describedby="duration-help"/><span>min</span></label>}
    <p id="duration-help">{invalid ? "Anna aika kokonaisina minuutteina (1–9999)." : value === "all" ? "Rajaa elokuvia käytettävissä olevan ajan mukaan." : "Näytetään vain aikaan mahtuvat elokuvat."}</p>
  </div>;
}
