const AARDE_STRAAL_METERS = 6371000;

export function haversine(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return AARDE_STRAAL_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Kompasrichting van punt 1 naar punt 2 in graden (0 = noord, 90 = oost)
export function richting(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = Math.PI / 180;
  const y = Math.sin((lng2 - lng1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lng2 - lng1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

// Afstand leesbaar: "40 m", "120 m", "1,2 km"
export function afstandTekst(meter: number): string {
  if (meter >= 1000) return `${(meter / 1000).toFixed(1).replace(".", ",")} km`;
  return `${meter < 100 ? Math.round(meter / 5) * 5 : Math.round(meter / 10) * 10} m`;
}

// Afronden op ~50m voor het tonen van andere spelers
export function afrondenOpRaster(lat: number, lng: number, rasterMeters = 50) {
  const graden = rasterMeters / 111320;
  return {
    lat: Math.round(lat / graden) * graden,
    lng: Math.round(lng / graden) * graden,
  };
}

// mm:ss, of u:mm:ss vanaf een uur (anders werd het bv. "4803:36")
export function formateerTijd(seconden: number): string {
  const u = Math.floor(seconden / 3600);
  const m = Math.floor((seconden % 3600) / 60).toString().padStart(2, "0");
  const s = (seconden % 60).toString().padStart(2, "0");
  return u > 0 ? `${u}:${m}:${s}` : `${m}:${s}`;
}

export function normaliserenNumeriek(invoer: string): number | null {
  const genormaliseerd = invoer.trim().replace(",", ".");
  const getal = parseFloat(genormaliseerd);
  return isNaN(getal) ? null : getal;
}

// Open antwoord vergelijken: hoofdletters, accenten, spaties en leestekens tellen niet mee, en bij
// antwoorden van 5+ tekens mag er één tikfout in zitten (letter mis, te veel, te weinig of twee omgedraaid)
export function normaliseerAntwoord(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function tekstKlopt(invoer: string, goed: string): boolean {
  const a = normaliseerAntwoord(invoer), b = normaliseerAntwoord(goed);
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  return tekstAfstand(a, b) <= 1;
}

// Voor de beheerder: hoeveel tikfouten scheelt een antwoord met het goede? (zelfde normalisering)
export function tekstAfstand(invoer: string, goed: string): number {
  const a = normaliseerAntwoord(invoer), b = normaliseerAntwoord(goed);
  // Damerau-Levenshtein (beperkt)
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const kost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + kost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// Ligt een plek binnen een vlak (lijst hoekpunten [lat, lng])? Straal-methode, goed genoeg voor kleine gebieden.
export function binnenVlak(lat: number, lng: number, punten: [number, number][]): boolean {
  let binnen = false;
  for (let i = 0, j = punten.length - 1; i < punten.length; j = i++) {
    const [ai, bi] = punten[i], [aj, bj] = punten[j];
    if ((bi > lng) !== (bj > lng) && lat < ((aj - ai) * (lng - bi)) / (bj - bi) + ai) binnen = !binnen;
  }
  return binnen;
}
