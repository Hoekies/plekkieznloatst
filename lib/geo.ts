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
