"use client";

import { useEffect, useState } from "react";
import SectieKop from "@/components/admin/SectieKop";

// Tijdlijn op het dashboard: wat er in het spel gebeurt, nieuwste bovenaan, in de kleur van de speler
type Gebeurtenis = { id: string; tijd: string; speler_id: string | null; icoon: string; item: string | null; tekst: string };

function geleden(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "nu";
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}u`;
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
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Laden…</div>
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
                <span className="tijdlijn-tijd">{geleden(g.tijd)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
