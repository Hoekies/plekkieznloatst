"use client";

import { useEffect, useState } from "react";

// Korte melding onderin het beheerscherm, in plaats van de grijze alert() van de browser.
// Overal te gebruiken met toonMelding("tekst") of toonMelding("tekst", "fout").
type Soort = "info" | "ok" | "fout";
type Item = { id: number; tekst: string; soort: Soort };

let volgend = 1;
const luisteraars = new Set<(m: Item) => void>();

export function toonMelding(tekst: string, soort: Soort = "info") {
  const m = { id: volgend++, tekst, soort };
  luisteraars.forEach((l) => l(m));
}

const ICOON: Record<Soort, string> = { info: "ℹ️", ok: "✅", fout: "⚠️" };
const DUUR: Record<Soort, number> = { info: 4000, ok: 4000, fout: 7000 };

export default function MeldingHouder() {
  const [meldingen, setMeldingen] = useState<Item[]>([]);
  useEffect(() => {
    const l = (m: Item) => {
      setMeldingen((lijst) => [...lijst.slice(-2), m]);
      setTimeout(() => setMeldingen((lijst) => lijst.filter((x) => x.id !== m.id)), DUUR[m.soort]);
    };
    luisteraars.add(l);
    return () => { luisteraars.delete(l); };
  }, []);
  if (!meldingen.length) return null;
  // In de stijl van de app: icoon in een rondje, de tekst, en onderaan een balkje dat de resterende tijd laat zien.
  // Tik om weg te halen.
  return (
    <div className="toast-houder" role="status" aria-live="polite">
      {meldingen.map((m) => (
        <div key={m.id} className={`toast toast--${m.soort}`} title="Tik om te sluiten"
          onClick={() => setMeldingen((lijst) => lijst.filter((x) => x.id !== m.id))}>
          <span className="toast-icoon" aria-hidden>{ICOON[m.soort]}</span>
          <span className="toast-tekst">{m.tekst}</span>
          <i className="toast-tijd" style={{ animationDuration: `${DUUR[m.soort]}ms` }} aria-hidden />
        </div>
      ))}
    </div>
  );
}
