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

// Afronden op ~50m voor het tonen van andere spelers
export function afrondenOpRaster(lat: number, lng: number, rasterMeters = 50) {
  const graden = rasterMeters / 111320;
  return {
    lat: Math.round(lat / graden) * graden,
    lng: Math.round(lng / graden) * graden,
  };
}

export function formateerTijd(seconden: number): string {
  const m = Math.floor(seconden / 60).toString().padStart(2, "0");
  const s = (seconden % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function normaliserenNumeriek(invoer: string): number | null {
  const genormaliseerd = invoer.trim().replace(",", ".");
  const getal = parseFloat(genormaliseerd);
  return isNaN(getal) ? null : getal;
}
