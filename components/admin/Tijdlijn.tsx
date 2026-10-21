"use client";

import { useEffect, useState } from "react";
import SectieKop from "@/components/admin/SectieKop";
import LaadBlokjes from "@/components/shared/LaadBlokjes";

// Tijdlijn op het dashboard: wat er in het spel gebeurt, nieuwste bovenaan, in de kleur van de speler
type Gebeurtenis = { id: string; tijd: string; speler_id: string | null; icoon: string; item: string | null; tekst: string };

// "nu", "5 min", "07:12" (vandaag), "gisteren 20:10" of "12 okt 20:10"
function geleden(iso: string): string {
  const d = new Date(iso);
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return "nu";
  if (sec < 3600) return `${Math.floor(sec / 60)} min`;
  const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  const dagen = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
  if (dagen <= 0) return tijd;
  if (dagen === 1) return `gisteren ${tijd}`;
  return `${d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} ${tijd}`;
}

export default function Tijdlijn({ kleuren }: { kleuren: Map<string, string> }) {
  const [items, setItems] = useState<Gebeurtenis[] | null>(null);

  useEffect(() => {
    let actief = true;
    async function laad() {
      try {
        const res = await fetch("/api/admin/live/gebeurtenissen");
        if (res.ok && actief) setItems((await res.json()).gebeurtenissen ?? []);
      } catch { /* verbindingsfout */ }
    }
    laad();
    const t = setInterval(laad, 8000);
    return () => { actief = false; clearInterval(t); };
  }, []);

  // Kop boven het paneel (net als "Spelende spelers"), zodat beide kolommen gelijk beginnen
  return (
    <div className="tijdlijn">
    <SectieKop titel="📜 Wat gebeurt er" />
    <div className="pr-gem-panel">
      <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items === null ? (
          <LaadBlokjes aantal={4} hoogte={22} gap={8} />
        ) : items.length === 0 ? (
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Nog niets gebeurd. Zodra spelers op pad gaan, zie je hier wat ze doen.</div>
        ) : (
          <div className="tijdlijn-lijst">
            {items.map((g) => (
              <div key={g.id} className="tijdlijn-regel" style={{ borderLeftColor: (g.speler_id && kleuren.get(g.speler_id)) || "rgba(255,255,255,0.2)" }}>
                <span className="tijdlijn-icoon" aria-hidden>
                  {g.item
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={`/items/${g.item}.webp`} alt="" style={{ width: 22, height: 22, display: "block" }} />
                    : g.icoon}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>{g.tekst}</span>
                <span className="tijdlijn-tijd" title={new Date(g.tijd).toLocaleString("nl-NL")}>{geleden(g.tijd)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
