"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { haversine } from "@/lib/geo";

// Looproutes langs wegen en voetpaden voor de route-editor. Elk stuk tussen twee punten
// wordt één keer opgevraagd (via /api/admin/wegen) en onthouden. Zolang een stuk er nog
// niet is, of de dienst niet bereikbaar is, valt alles terug op de rechte lijn.
export type Plek = { lat: number; lng: number };
type Stuk = { afstandM: number; lijn: [number, number][] };

// Richting maakt voor lopen niet uit: a→b en b→a delen één opgevraagd stuk
const punt = (p: Plek) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
const sleutel = (a: Plek, b: Plek) => `${punt(a)}>${punt(b)}`;
const geordend = (a: Plek, b: Plek): [Plek, Plek, boolean] => (punt(a) <= punt(b) ? [a, b, false] : [b, a, true]);

const bekend = new Map<string, Stuk | null>();  // over de hele pagina, ook na opnieuw tekenen

// aan = false: alles hemelsbreed, er wordt niets opgevraagd
export function useWegen(paren: [Plek, Plek][], aan = true) {
  const [versie, setVersie] = useState(0);
  const bezigRef = useRef(new Set<string>());
  const pakket = useMemo(() => {
    const uniek = new Map<string, { a: Plek; b: Plek }>();
    for (const [x, y] of paren) {
      if (punt(x) === punt(y)) continue;
      const [a, b] = geordend(x, y);
      uniek.set(sleutel(a, b), { a, b });
    }
    return uniek;
  }, [paren]);

  useEffect(() => {
    if (!aan) return;
    const ontbreekt = [...pakket].filter(([k]) => !bekend.has(k) && !bezigRef.current.has(k)).map(([, p]) => p);
    if (!ontbreekt.length) return;
    // Even wachten: tijdens slepen of snel achter elkaar wijzigen niet elke keer opvragen
    const t = setTimeout(async () => {
      const deel = ontbreekt.slice(0, 80);
      deel.forEach((p) => bezigRef.current.add(sleutel(p.a, p.b)));
      try {
        const res = await fetch("/api/admin/wegen", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paren: deel }),
        });
        if (res.ok) {
          const data: Record<string, Stuk | null> = await res.json();
          for (const [k, stuk] of Object.entries(data)) if (stuk) bekend.set(k, stuk);
          setVersie((v) => v + 1);
        }
      } catch { /* geen verbinding: rechte lijnen blijven staan */ }
      deel.forEach((p) => bezigRef.current.delete(sleutel(p.a, p.b)));
    }, 600);
    return () => clearTimeout(t);
  }, [pakket, aan]);

  return useMemo(() => {
    void versie;
    // Stuk van a naar b: afstand en lijn in looprichting (null = nog niet bekend)
    const stuk = (a: Plek, b: Plek): { afstandM: number; lijn: Plek[] } | null => {
      const [x, y, omgekeerd] = geordend(a, b);
      const s = aan ? bekend.get(sleutel(x, y)) : undefined;
      if (!s || !s.lijn.length) return null;
      // De routeservice begint en eindigt op de dichtstbijzijnde weg of het dichtstbijzijnde pad.
      // Ligt een punt daar een stukje vanaf (bijv. de start op een plein), dan de lijn netjes
      // doortrekken naar het punt zelf en dat stukje meetellen.
      const weg = s.lijn.map(([lat, lng]) => ({ lat, lng }));
      const begin = weg[0], eind = weg[weg.length - 1];
      const aanloop = haversine(x.lat, x.lng, begin.lat, begin.lng);
      const uitloop = haversine(eind.lat, eind.lng, y.lat, y.lng);
      const lijn = [...(aanloop > 1 ? [x] : []), ...weg, ...(uitloop > 1 ? [y] : [])];
      return { afstandM: s.afstandM + aanloop + uitloop, lijn: omgekeerd ? lijn.reverse() : lijn };
    };
    const afstand = (a: Plek, b: Plek) => stuk(a, b)?.afstandM ?? haversine(a.lat, a.lng, b.lat, b.lng);
    const lijn = (a: Plek, b: Plek) => stuk(a, b)?.lijn ?? [a, b];
    const compleet = aan && [...pakket.keys()].every((k) => bekend.has(k));
    // Totale afstand langs een reeks punten
    const totaal = (route: Plek[]) => route.slice(1).reduce((som, p, i) => som + afstand(route[i], p), 0);
    return { afstand, lijn, totaal, compleet, aan };
  }, [pakket, versie, aan]);
}
