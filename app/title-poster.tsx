"use client";
import { useState } from "react";
import { Film } from "lucide-react";
import { posterUrl, type Title } from "@/lib/model";
export default function Poster({ title, size = "w342", className = "" }: { title: Title; size?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = posterUrl(title.poster, size);
  return src && !failed ? <img className={className} src={src} alt={`${title.title} – juliste`} loading="lazy" onError={() => setFailed(true)} /> : <div className={`poster-fallback ${className}`}><Film size={28}/><span>{title.title}</span></div>;
}
