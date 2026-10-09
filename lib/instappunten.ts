// Verspreid: kies per team een instappunt in het rondje.
// Doel: de aanloop (van de startplek naar het eerste punt) is voor elk team ongeveer even lang,
// en de teams beginnen toch verspreid over het rondje, zodat ze niet achter elkaar aan lopen.
// Deze functie wordt gebruikt door de route-editor (voorbeeld) én bij het starten van een sessie,
// zodat het voorbeeld precies klopt met het spel.

type Plek = { lat: number; lng: number };

function meter(a: Plek, b: Plek): number {
  const kx = 111320 * Math.cos((a.lat * Math.PI) / 180), ky = 110540;
  return Math.hypot((b.lng - a.lng) * kx, (b.lat - a.lat) * ky);
}

// Geeft per team (0..n-1) de index van het instappunt in `lus` terug
export function kiesInstappunten(start: Plek, lus: Plek[], teams: number): number[] {
  const m = lus.length, n = Math.max(1, teams);
  if (m === 0) return [];
  if (n >= m) return Array.from({ length: n }, (_, k) => k % m);

  // Afstand langs het (gesloten) rondje tot elk punt
  const cum = [0];
  for (let i = 1; i < m; i++) cum.push(cum[i - 1] + meter(lus[i - 1], lus[i]));
  const L = cum[m - 1] + meter(lus[m - 1], lus[0]);
  if (L === 0) return Array.from({ length: n }, (_, k) => k % m);
  const aanloop = lus.map((p) => meter(start, p));
  const circ = (a: number, b: number) => { const d = Math.abs(a - b) % L; return Math.min(d, L - d); };
  const stap = L / n;

  let beste: number[] | null = null, besteScore = Infinity;
  for (let r = 0; r < m; r++) {
    // Per team de 3 punten die het dichtst bij de ideale, gelijkmatige plek liggen
    const kandidaten = Array.from({ length: n }, (_, k) => {
      const doel = (cum[r] + k * stap) % L;
      return [...Array(m).keys()]
        .sort((a, b) => circ(cum[a], doel) - circ(cum[b], doel))
        .slice(0, 3)
        .filter((i, idx) => idx === 0 || circ(cum[i], doel) <= stap / 2);
    });
    // Alle combinaties proberen (hooguit 3^n per startrotatie)
    const keuze: number[] = [];
    const zoek = (k: number) => {
      if (k === n) {
        if (new Set(keuze).size < n) return;
        const a = keuze.map((i) => aanloop[i]);
        const spreiding = Math.max(...a) - Math.min(...a);
        const afwijking = Math.max(...keuze.map((i, t) => circ(cum[i], (cum[r] + t * stap) % L)));
        // Vooral gelijke aanloop; daarna zo gelijkmatig mogelijk verspreid; kortere aanloop iets beter
        const score = spreiding + 0.5 * afwijking + 0.05 * Math.max(...a);
        if (score < besteScore) { besteScore = score; beste = [...keuze]; }
        return;
      }
      for (const i of kandidaten[k]) { keuze.push(i); zoek(k + 1); keuze.pop(); }
    };
    zoek(0);
  }
  return beste ?? Array.from({ length: n }, (_, k) => Math.round((k * m) / n) % m);
}
