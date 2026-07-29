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

// ── Mist-modus: rastercellen voor het wegspelen van mist ────────────────────────
const METERS_PER_GRAAD_LAT = 111320;
function metersPerGraadLng(lat: number): number {
  return METERS_PER_GRAAD_LAT * Math.cos((lat * Math.PI) / 180);
}

export const MIST_CEL_METER = 20;
export const MIST_CEL_OPPERVLAK_M2 = MIST_CEL_METER * MIST_CEL_METER;
export const MIST_ONTHUL_STRAAL_M = 25;

export function naarMistCel(lat: number, lng: number): { x: number; y: number } {
  return {
    x: Math.floor((lng * metersPerGraadLng(lat)) / MIST_CEL_METER),
    y: Math.floor((lat * METERS_PER_GRAAD_LAT) / MIST_CEL_METER),
  };
}

export function mistCelNaarLatLng(x: number, y: number): { lat: number; lng: number } {
  const lat = ((y + 0.5) * MIST_CEL_METER) / METERS_PER_GRAAD_LAT;
  const lng = ((x + 0.5) * MIST_CEL_METER) / metersPerGraadLng(lat);
  return { lat, lng };
}

// Alle celindices waarvan het middelpunt binnen MIST_ONTHUL_STRAAL_M van (lat,lng) valt.
export function mistCellenBinnenStraal(lat: number, lng: number): { x: number; y: number }[] {
  const schaalLng = metersPerGraadLng(lat);
  const centrum = naarMistCel(lat, lng);
  const centerXMeter = lng * schaalLng;
  const centerYMeter = lat * METERS_PER_GRAAD_LAT;
  const cellenRadius = Math.ceil(MIST_ONTHUL_STRAAL_M / MIST_CEL_METER);

  const resultaat: { x: number; y: number }[] = [];
  for (let dx = -cellenRadius; dx <= cellenRadius; dx++) {
    for (let dy = -cellenRadius; dy <= cellenRadius; dy++) {
      const x = centrum.x + dx;
      const y = centrum.y + dy;
      const celMidXMeter = (x + 0.5) * MIST_CEL_METER;
      const celMidYMeter = (y + 0.5) * MIST_CEL_METER;
      const afstand = Math.hypot(celMidXMeter - centerXMeter, celMidYMeter - centerYMeter);
      if (afstand <= MIST_ONTHUL_STRAAL_M) resultaat.push({ x, y });
    }
  }
  return resultaat;
}
