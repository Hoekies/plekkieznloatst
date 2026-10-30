"use client";

import { useEffect, useState } from "react";
import type { TeamStatistiek, Record_ } from "@/lib/statistieken";

// 📊 Spelstatistieken op het finishscherm (na de uitslag, als de route dat aan heeft): eigen cijfers en de records
export default function SpelStatistieken() {
  const [data, setData] = useState<{ aan: boolean; eigen?: TeamStatistiek | null; records?: Record_[]; team?: string; route?: string; score?: number } | null>(null);
  useEffect(() => {
    fetch("/api/speler/statistieken", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setData(d)).catch(() => undefined);
  }, []);
  if (!data?.aan || (!data.eigen && !data.records?.length)) return null;
  const e = data.eigen;
  const tegels: [string, string, string][] = e ? [
    ["✅", `${e.goed}`, "goed"],
    ["❌", `${e.fout}`, "fout"],
    ...(e.overgeslagen ? [["⏭️", `${e.overgeslagen}`, "overgeslagen"] as [string, string, string]] : []),
    ...(e.snelste !== null ? [["⚡", `${e.snelste} s`, "snelste antwoord"] as [string, string, string]] : []),
    ...(e.gemiddeld !== null ? [["⏱️", `${e.gemiddeld} s`, "gemiddeld nadenken"] as [string, string, string]] : []),
    ...(e.langsteStuk !== null ? [["🚶", `${e.langsteStuk} min`, "langste stuk lopen"] as [string, string, string]] : []),
    ["👟", `${e.km.toString().replace(".", ",")} km`, "gelopen"],
    ["🎁", `${e.itemsIngezet}`, "items ingezet"],
    ["🎯", `${e.geraakt}`, "keer geraakt"],
  ] : [];
  // Delen kan alleen de spelleider (🖼️ Uitslag en cijfers delen in het beheer)
  return (
    <div className="stats">
      <div className="stats-kop">📊 Jullie spel in cijfers</div>
      {tegels.length > 0 && (
        <div className="stats-tegels">
          {tegels.map(([emoji, waarde, label]) => (
            <div key={label} className="stats-tegel"><span aria-hidden>{emoji}</span><strong>{waarde}</strong><small>{label}</small></div>
          ))}
        </div>
      )}
      {!!data.records?.length && (
        <>
          <div className="stats-subkop">🏆 Records van dit spel</div>
          <div className="stats-records">
            {data.records.map((r) => (
              <div key={r.titel} className="stats-record"><span aria-hidden>{r.emoji}</span><span>{r.titel}</span><strong>{r.team}</strong><em>{r.waarde}</em></div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
