import { binnenVlak } from "@/lib/geo";

// 🛣️ Een plek op het dichtstbijzijnde stuk waar je kunt lopen (weg, stoep, voetpad, parkeerterrein), via
// de voetgangersrouting van OpenStreetMap (dezelfde gratis dienst als /api/admin/wegen). Voor items: die
// moeten op de weg liggen, niet in een tuin of tussen huizen. Ligt de dichtstbijzijnde weg verder dan
// maxM weg, of is de dienst niet bereikbaar, dan blijft de plek zoals hij was.
// 🛝 Uitzondering: een item op een speelplaats of schoolplein blijft liggen waar het ligt (daar kun je ook
// lopen, maar de routing kent zo'n plein niet als pad).
type Plek = { lat: number; lng: number };
export type Vlak = [number, number][];

// Speelplaatsen en schoolpleinen rond deze plekken, als vlakken [lat, lng][] (uit OpenStreetMap via Overpass).
// Eén keer opvragen voor een hele reeks items. Niet bereikbaar: geen vlakken (dan gewoon op de weg).
export async function speelplaatsen(plekken: Plek[]): Promise<Vlak[]> {
  if (!plekken.length) return [];
  const marge = 0.003;  // ± 300 m
  const z = Math.min(...plekken.map((p) => p.lat)) - marge, n = Math.max(...plekken.map((p) => p.lat)) + marge;
  const w = Math.min(...plekken.map((p) => p.lng)) - marge, o = Math.max(...plekken.map((p) => p.lng)) + marge;
  const bbox = `${z},${w},${n},${o}`;
  const vraag = `[out:json][timeout:4];(way["leisure"~"^(playground|schoolyard)$"](${bbox});way["amenity"~"^(school|kindergarten)$"](${bbox}););out geom;`;
  // Zelfde servers en afzender als bij de vraag-ideeën (een andere User-Agent wordt soms geweigerd)
  for (const server of ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]) {
    try {
      const res = await fetch(server, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PointRush/1.0 (hoekies.nl)" },
        body: "data=" + encodeURIComponent(vraag),
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      return ((data?.elements ?? []) as { geometry?: { lat: number; lon: number }[] }[])
        .filter((e) => (e.geometry?.length ?? 0) >= 3)
        .map((e) => e.geometry!.map((g): [number, number] => [g.lat, g.lon]));
    } catch { /* volgende server */ }
  }
  return [];
}

export function opSpeelplaats(p: Plek, vlakken: Vlak[]): boolean {
  return vlakken.some((v) => binnenVlak(p.lat, p.lng, v));
}

// vlakken: al opgehaalde speelplaatsen (bij een reeks items); zonder: hier opvragen rond deze ene plek
export async function opDeWeg(p: Plek, maxM = 60, vlakken?: Vlak[]): Promise<Plek> {
  if (opSpeelplaats(p, vlakken ?? await speelplaatsen([p]))) return p;
  try {
    const res = await fetch(`https://routing.openstreetmap.de/routed-foot/nearest/v1/foot/${p.lng},${p.lat}?number=1`, {
      headers: { "User-Agent": "PointRush route-editor (plekkieznloatst.vercel.app)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return p;
    const w = (await res.json())?.waypoints?.[0];
    if (!w?.location || typeof w.distance !== "number" || w.distance > maxM) return p;
    return { lat: w.location[1], lng: w.location[0] };
  } catch {
    return p;
  }
}
