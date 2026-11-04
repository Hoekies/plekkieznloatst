"use client";

import { useEffect, useState } from "react";
import UitklapPijl from "@/components/shared/UitklapPijl";

// 🌦️ Weer bij de start van de route: de komende uren met temperatuur en regenkans (Open-Meteo, gratis en
// zonder sleutel). Alleen de plek van het startpunt gaat naar de weerdienst. Lukt het niet, dan niets.
// Eén regel (hulpvragen horen bovenaan het scherm te passen); tik voor de uren, open of dicht wordt onthouden.
// Het dashboard staat vaak uren open: elk half uur opnieuw ophalen, anders toont het voorbije uren.
type Uur = { tijd: string; temp: number; regen: number; code: number };

function weerEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67 || (code >= 80 && code <= 82)) return "🌧️";
  if (code <= 77 || code === 85 || code === 86) return "🌨️";
  return "⛈️";
}

export default function WeerBericht({ lat, lng }: { lat: number; lng: number }) {
  const [uren, setUren] = useState<Uur[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setOpen(localStorage.getItem("pr_dash_weer_open") === "1"); } catch { /* geen opslag */ } }, []);
  function wissel() {
    setOpen((o) => { try { localStorage.setItem("pr_dash_weer_open", o ? "0" : "1"); } catch { /* geen opslag */ } return !o; });
  }
  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}`
      + "&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Europe%2FAmsterdam&forecast_days=2";
    const laad = () => fetch(url).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d?.hourly?.time) return;
      const nu = Date.now() - 3600_000;
      const lijst: Uur[] = d.hourly.time.map((t: string, i: number) => ({
        tijd: t, temp: Math.round(d.hourly.temperature_2m[i]), regen: d.hourly.precipitation_probability[i] ?? 0, code: d.hourly.weather_code[i] ?? 0,
      })).filter((u: Uur) => new Date(u.tijd).getTime() >= nu).slice(0, 8);
      setUren(lijst);
    }).catch(() => undefined);
    laad();
    const t = setInterval(() => { if (!document.hidden) laad(); }, 30 * 60000);
    return () => clearInterval(t);
  }, [lat, lng]);
  if (!uren?.length) return null;
  const natsteUur = uren.reduce((a, b) => (b.regen > a.regen ? b : a));
  return (
    <div className="weer" title="Weer bij het startpunt van de route (Open-Meteo)">
      <button type="button" className="weer-kop" onClick={wissel} aria-expanded={open}>
        <UitklapPijl open={open} />
        <span>{weerEmoji(uren[0].code)} {uren[0].temp}°</span>
        <span className={natsteUur.regen >= 50 ? "weer-let" : undefined}>{natsteUur.regen >= 50 ? `regen rond ${natsteUur.tijd.slice(11, 16)}` : natsteUur.regen < 20 ? "droog" : `regenkans tot ${natsteUur.regen}%`}</span>
      </button>
      {open && <div className="weer-uren">
        {uren.map((u) => (
          <div key={u.tijd} className={`weer-uur${u.regen >= 50 ? " weer-uur--nat" : ""}`}>
            <small>{u.tijd.slice(11, 13)}u</small>
            <span aria-hidden>{weerEmoji(u.code)}</span>
            <strong>{u.temp}°</strong>
            <small className="weer-regen">💧{u.regen}%</small>
          </div>
        ))}
      </div>}
    </div>
  );
}
