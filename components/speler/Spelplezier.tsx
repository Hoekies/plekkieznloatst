"use client";

import { useEffect, useRef, useState } from "react";
import { BADGES, RAD_VAKKEN, isBadge, type SpelplezierAan } from "@/lib/spelplezier";
import { speelBonus, speelOverwinning } from "@/lib/sounds";

// 🎉 Spelplezier op de kaart (migratie 007): vraagt elke 5 seconden (met de eigen plek) wat er speelt:
// ⏰ gouden kwartier (balk bovenin), 🎖️ nieuwe badges, 🎰 het rad van fortuin (halverwege), 📦 de vliegende schat
// en de eigen 🪤 val (allebei als marker op de kaart), en meldingen als de schat gepakt is of iemand in de val liep.

export type KaartMarker = { id: string; lat: number; lng: number; emoji: string; titel: string };
type Data = {
  aan: SpelplezierAan | null;
  gouden_tot?: string | null;
  badges?: { soort: string; created_at: string }[];
  rad?: boolean;
  schat?: { id: string; lat: number; lng: number; tot: string } | null;
  schat_gepakt?: string | null;
  val?: { lat: number; lng: number; tot: string } | null;
  val_geraakt?: { id: string; door: string; punten: number }[];
};
type Toast = { id: string; emoji: string; titel: string; tekst: string };

// Vaak als de plek telt (val, schat) of het rad kan komen; anders rustig (alleen gouden kwartier en badges)
const POLL_MS = 5000;
const POLL_RUSTIG_MS = 15000;
const ITEM_NAAM: Record<string, string> = { ster: "Ster", verdubbeling: "Verdubbeling", radar: "Radar", bom: "Bom", spook: "Spook", banaan: "Banaan" };

// Wat de speler al gezien heeft (per spel), zodat een badge of melding maar één keer komt
function gezien(sessieId: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(`pr_plezier_${sessieId}`) ?? "[]")); } catch { return new Set(); }
}
function bewaarGezien(sessieId: string, s: Set<string>) {
  try { localStorage.setItem(`pr_plezier_${sessieId}`, JSON.stringify([...s].slice(-200))); } catch { /* geen opslag */ }
}

export default function Spelplezier({ sessieId, positie, onMarkers }: {
  sessieId: string;
  positie: { latitude: number; longitude: number; accuracy: number } | null;
  onMarkers: (m: KaartMarker[]) => void;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [radOpen, setRadOpen] = useState(false);
  const [nu, setNu] = useState(() => Date.now());
  const plekRef = useRef(positie);
  plekRef.current = positie;
  const markersRef = useRef(onMarkers);
  markersRef.current = onMarkers;

  const toon = (t: Toast) => {
    setToasts((l) => [...l.filter((x) => x.id !== t.id), t]);
    window.setTimeout(() => setToasts((l) => l.filter((x) => x.id !== t.id)), 6000);
  };

  useEffect(() => {
    let weg = false;
    let timer: number | undefined;
    const haal = async () => {
      await haalEens();
    };
    const haalEens = async () => {
      const p = plekRef.current;
      const q = p ? `?lat=${p.latitude}&lng=${p.longitude}&acc=${Math.round(p.accuracy)}` : "";
      const res = await fetch(`/api/speler/spelplezier${q}`, { cache: "no-store" }).catch(() => null);
      const d: Data | null = res?.ok ? await res.json().catch(() => null) : null;
      if (weg) return;
      const snel = !!d?.aan && (d.aan.val || d.aan.schat || d.aan.rad);
      timer = window.setTimeout(haal, snel ? POLL_MS : POLL_RUSTIG_MS);
      if (!d) return;
      setData(d);
      // Nieuwe badges, val-meldingen en een gepakte schat: één keer laten zien
      const al = gezien(sessieId);
      for (const b of d.badges ?? []) {
        const sleutel = `badge-${b.soort}`;
        if (al.has(sleutel) || !isBadge(b.soort)) continue;
        al.add(sleutel);
        const info = BADGES[b.soort];
        toon({ id: sleutel, emoji: info.emoji, titel: `Badge: ${info.naam}!`, tekst: info.uitleg });
        speelBonus();
      }
      for (const v of d.val_geraakt ?? []) {
        const sleutel = `val-${v.id}`;
        if (al.has(sleutel)) continue;
        al.add(sleutel);
        toon({ id: sleutel, emoji: "🪤", titel: "Raak!", tekst: `${v.door} liep in jullie val (−${v.punten} bij hen)` });
      }
      if (d.schat_gepakt) {
        toon({ id: `schat-${Date.now()}`, emoji: "📦", titel: "Schat gepakt!", tekst: `${ITEM_NAAM[d.schat_gepakt] ?? d.schat_gepakt} in jullie balk` });
        speelBonus();
      }
      bewaarGezien(sessieId, al);
      const m: KaartMarker[] = [];
      if (d.schat) m.push({ id: `schat-${d.schat.id}`, lat: d.schat.lat, lng: d.schat.lng, emoji: "📦", titel: "Vliegende schat" });
      if (d.val) m.push({ id: "val", lat: d.val.lat, lng: d.val.lng, emoji: "🪤", titel: "Jullie val" });
      markersRef.current(m);
    };
    haal();
    return () => { weg = true; window.clearTimeout(timer); };
  }, [sessieId]);

  // Klok voor het gouden kwartier
  const gouden = data?.gouden_tot ? Date.parse(data.gouden_tot) : 0;
  useEffect(() => {
    if (!gouden) return;
    const t = setInterval(() => setNu(Date.now()), 1000);
    return () => clearInterval(t);
  }, [gouden]);
  const goudenRest = gouden ? Math.max(0, Math.ceil((gouden - nu) / 1000)) : 0;

  return (
    <>
      {goudenRest > 0 && (
        <div className="gouden-balk" role="status">
          ⏰ <strong>Gouden kwartier</strong> · dubbele punten · {Math.floor(goudenRest / 60)}:{String(goudenRest % 60).padStart(2, "0")}
        </div>
      )}
      {data?.rad && !radOpen && (
        <button type="button" className="rad-knop" onClick={() => setRadOpen(true)}>🎰 Draai aan het rad!</button>
      )}
      {radOpen && <RadVanFortuin onKlaar={(t) => { setRadOpen(false); if (t) { setData((d) => d && { ...d, rad: false }); toon(t); } }} />}
      {toasts.length > 0 && (
        <div className="plezier-toasts">
          {toasts.map((t) => (
            <div key={t.id} className="plezier-toast" onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))}>
              <span className="plezier-toast-emoji" aria-hidden>{t.emoji}</span>
              <span><strong>{t.titel}</strong><br />{t.tekst}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// 🎰 Het rad: de server kiest het vak, het rad draait er in een paar seconden naartoe
function RadVanFortuin({ onKlaar }: { onKlaar: (t: Toast | null) => void }) {
  const [hoek, setHoek] = useState(0);
  const [uitslag, setUitslag] = useState<{ tekst: string; vak: number } | null>(null);
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const n = RAD_VAKKEN.length, vakGraden = 360 / n;

  async function draai() {
    setBezig(true); setFout("");
    const res = await fetch("/api/speler/rad", { method: "POST" }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setFout(d.fout ?? "Geen verbinding, probeer het opnieuw"); setBezig(false); return; }
    // Vijf rondjes en dan stoppen met het gekozen vak onder de pijl (bovenaan)
    setHoek(5 * 360 + (360 - (d.vak * vakGraden + vakGraden / 2)));
    window.setTimeout(() => {
      setUitslag({ tekst: d.tekst, vak: d.vak });
      if ((RAD_VAKKEN[d.vak]?.punten ?? 0) >= 100) speelOverwinning(); else speelBonus();
    }, 4200);
  }

  const verloop = RAD_VAKKEN.map((v, i) => `${v.kleur} ${i * vakGraden}deg ${(i + 1) * vakGraden}deg`).join(", ");
  return (
    <div className="rad-achter">
      <div className="pr-panel rad-paneel">
        <div className="pr-panel-inner rad-inhoud">
          <div className="rad-titel">🎰 Rad van fortuin</div>
          <p className="rad-uitleg">Halverwege! Eén keer draaien: punten, een item… of pech.</p>
          <div className="rad-houder">
            <span className="rad-pijl" aria-hidden>▼</span>
            <div className="rad" style={{ background: `conic-gradient(${verloop})`, transform: `rotate(${hoek}deg)` }}>
              {RAD_VAKKEN.map((v, i) => (
                <span key={v.id} className="rad-label" style={{ transform: `rotate(${i * vakGraden + vakGraden / 2}deg)` }}>{v.label}</span>
              ))}
            </div>
          </div>
          {uitslag ? (
            <>
              <div className="rad-uitslag">{RAD_VAKKEN[uitslag.vak]?.label} · {uitslag.tekst}</div>
              <button type="button" className="btn-premium--compact" onClick={() => onKlaar({ id: `rad-${Date.now()}`, emoji: "🎰", titel: "Rad van fortuin", tekst: uitslag.tekst })}>Verder spelen</button>
            </>
          ) : (
            <>
              {fout && <p className="rad-fout">{fout}</p>}
              <button type="button" className="btn-premium--compact" disabled={bezig} onClick={draai}>{bezig ? "Draait…" : "DRAAI!"}</button>
              {!bezig && <button type="button" className="item-later" onClick={() => onKlaar(null)}>Later</button>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
