"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { RoutePunt, SpeciaalItem } from "@/types/database";
import type { MeespeelData } from "@/lib/meespelen";
import { ITEM_INFO } from "./SpeciaalItemLegende";

const SpelerLeaflet = dynamic(() => import("./SpelerLeaflet"), { ssr: false });

const VERVERS_MS = 15000;
const GEEN_PUNTEN: RoutePunt[] = [];
const GEEN_IDS = new Set<string>();

const EIND_TEKST = {
  klaar: (team: string) => `${team} is binnen. Bedankt voor het meespelen!`,
  gestopt: (team: string) => `Het spel van ${team} is gestopt.`,
  uit: () => "De spelleider heeft meekijken op deze route uitgezet.",
};

// 🤝 Meespeellink: de items die nog op het speelveld liggen, de verdiende letters, de balk en de score van het team.
// Alleen kijken; het volgende punt en de plek van het team staan hier bewust niet op. Zie lib/meespelen-server.ts
export default function MeespeelScherm({ sessie, sleutel, linkKlopt }: { sessie: string; sleutel: string; linkKlopt: boolean }) {
  const [data, setData] = useState<MeespeelData | null>(null);
  const [fout, setFout] = useState<string | null>(linkKlopt ? null : "Deze link werkt niet");
  const vorige = useRef("");
  const actief = data?.actief !== false;

  useEffect(() => {
    if (!linkKlopt || !actief) return;
    let weg = false;
    const haal = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch(`/api/meespelen/${sessie}/${sleutel}`, { cache: "no-store" });
        const tekst = await res.text();
        if (weg) return;
        if (!res.ok) { setFout((JSON.parse(tekst) as { fout?: string }).fout ?? "Deze link werkt niet"); return; }
        setFout(null);
        // Alleen bij verandering: anders tekent de kaart de items steeds opnieuw
        if (tekst !== vorige.current) { vorige.current = tekst; setData(JSON.parse(tekst)); }
      } catch { /* even geen verbinding: de vorige stand blijft staan */ }
    };
    haal();
    const t = setInterval(haal, VERVERS_MS);
    document.addEventListener("visibilitychange", haal);
    return () => { weg = true; clearInterval(t); document.removeEventListener("visibilitychange", haal); };
  }, [sessie, sleutel, linkKlopt, actief]);

  // 📍 De eigen plek, pas als de medespeler erom vraagt
  const [positie, setPositie] = useState<GeolocationCoordinates | null>(null);
  const [plekAan, setPlekAan] = useState(false);
  const [plekFout, setPlekFout] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
  useEffect(() => () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); }, []);
  function wisselPlek() {
    if (plekAan) {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      setPlekAan(false);
      setPositie(null);
      return;
    }
    if (!navigator.geolocation) { setPlekFout("Deze browser kan je plek niet tonen"); return; }
    setPlekFout(null);
    setPlekAan(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => setPositie(p.coords),
      () => { setPlekFout("Je plek is niet beschikbaar: geef de browser toegang tot je locatie"); setPlekAan(false); },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }

  const items = useMemo(() => (data?.actief ? data.items as unknown as SpeciaalItem[] : []), [data]);
  const verboden = useMemo(() => (data?.actief ? data.verboden : []), [data]);
  // De kaart begint op de items; de plek van de medespeler komt pas als die erom vraagt
  const beginGebied = useMemo(() => items.map((i) => [i.latitude, i.longitude] as [number, number]), [items]);

  if (fout || data?.actief === false) {
    const tekst = fout ?? (data?.actief === false ? EIND_TEKST[data.reden](data.team) : "");
    return (
      <main className="meespeel meespeel--melding">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/spellogo/vierkant.webp" alt="PointRush" className="meespeel-logo-groot" />
        <p>{tekst}</p>
      </main>
    );
  }
  if (!data) return <main className="meespeel meespeel--melding"><p>Even laden…</p></main>;

  const heeftKaart = data.modus !== "sequentieel";
  return (
    <main className="meespeel">
      <header className="meespeel-kop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/spellogo/breed.webp" alt="PointRush" className="meespeel-logo" />
        <div className="meespeel-team">
          <span>🤝 Meespelen met</span>
          <strong>{data.team}</strong>
        </div>
        <div className="meespeel-score" aria-label={`Score: ${data.score}`}>⭐ {data.score}</div>
      </header>

      {data.puzzel && (
        <section className="meespeel-vak" aria-label="Puzzelwoord">
          <div className="puzzel-tegels">
            {data.puzzel.letters.map((l, i) => <span key={i} className={`puzzel-tegel${l ? " puzzel-tegel--open" : ""}`}>{l ?? ""}</span>)}
          </div>
          {data.puzzel.omschrijving && <span className="meespeel-tip">{data.puzzel.omschrijving}</span>}
        </section>
      )}

      {data.balk.length > 0 && (
        <section className="meespeel-vak meespeel-balk" aria-label="Items van het team">
          <span className="meespeel-tip">In de balk:</span>
          {data.balk.map((type, i) => (
            <span key={`${type}-${i}`} className="meespeel-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/items/${type}.webp`} alt="" />
              {ITEM_INFO[type]?.naam ?? type}
            </span>
          ))}
        </section>
      )}

      {heeftKaart ? (
        <section className="meespeel-kaart" aria-label="Items op het speelveld">
          <SpelerLeaflet positie={positie} punten={GEEN_PUNTEN} verwerktIds={GEEN_IDS} bereiktIds={GEEN_IDS} activePuntId={null}
            andereSpelers={[]} specialeItems={items} ghostedPuntId={null} verbodenGebieden={verboden} beginGebied={beginGebied} stijlOnder={12} />
          <button type="button" className="rl-knop meespeel-plek" aria-pressed={plekAan} onClick={wisselPlek}>📍 {plekAan ? "Mijn plek uit" : "Toon mijn plek"}</button>
          {plekFout && <span className="meespeel-plekfout" role="alert">{plekFout}</span>}
          {items.length === 0 && <span className="meespeel-leeg">Er liggen nu geen items op het speelveld</span>}
        </section>
      ) : (
        <section className="meespeel-vak meespeel-geenkaart">Op deze route liggen geen items op de kaart. Hier zie je de letters, de balk en de score van het team.</section>
      )}
    </main>
  );
}
