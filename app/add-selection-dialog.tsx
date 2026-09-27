"use client";

import { Loader2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { SELECTED_BY, type SelectedBy, type Title } from "@/lib/model";
import Poster from "./title-poster";

export type PendingAddition = { title: Title; status: "watchlist" | "watched" };

export default function AddSelectionDialog({ pending, busy, onCancel, onChoose }: {
  pending: PendingAddition | null; busy: boolean; onCancel: () => void; onChoose: (selectedBy: SelectedBy) => void;
}) {
  return <Dialog open={Boolean(pending)} onOpenChange={open => { if (!open && !busy) onCancel(); }}>
    <DialogContent className="add-selection-dialog" showCloseButton={!busy} onInteractOutside={event => { if (busy) event.preventDefault(); }} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}>
      <DialogTitle>Kenen valinta?</DialogTitle>
      <DialogDescription>Valitse nimi, niin teos lisätään yhteisiin {pending?.status === "watched" ? "katsottuihin" : "katsottaviin"}. Voit muuttaa valintaa myöhemmin kortilta.</DialogDescription>
      {pending && <div className="selection-title"><Poster title={pending.title} size="w92"/><div><strong>{pending.title.title}</strong><p>{pending.title.year || "–"} · {pending.title.mediaType === "movie" ? "Elokuva" : "Sarja"}</p></div></div>}
      <div className="add-selection-choices">{(Object.keys(SELECTED_BY) as SelectedBy[]).map(value => <button type="button" key={value} disabled={busy} onClick={() => onChoose(value)}><span className={`avatar ${value === "person2" ? "second" : value === "both" ? "both" : ""}`}>{value === "both" ? <Users size={19}/> : SELECTED_BY[value][0]}</span>{SELECTED_BY[value]}</button>)}</div>
      {busy ? <p className="selection-saving" role="status"><Loader2 size={16} className="spin"/>Tallennetaan yhteiselle listalle…</p> : <DialogClose asChild><button className="text-button selection-cancel">Peruuta</button></DialogClose>}
    </DialogContent>
  </Dialog>;
}
