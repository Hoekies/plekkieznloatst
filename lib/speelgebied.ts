import type * as Leaflet from "leaflet";

type Plek = { lat: number; lng: number };

// Omhullende van alle punten (convex hull), daarna een stuk naar buiten geschoven: het speelgebied
function omhullende(punten: Plek[], marge: number): Plek[] {
  const p = [...punten].sort((a, b) => a.lng - b.lng || a.lat - b.lat);
  if (p.length < 3) return [];
  const kruis = (o: Plek, a: Plek, b: Plek) => (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
  const onder: Plek[] = [];
  for (const q of p) { while (onder.length >= 2 && kruis(onder[onder.length - 2], onder[onder.length - 1], q) <= 0) onder.pop(); onder.push(q); }
  const boven: Plek[] = [];
  for (const q of [...p].reverse()) { while (boven.length >= 2 && kruis(boven[boven.length - 2], boven[boven.length - 1], q) <= 0) boven.pop(); boven.push(q); }
  const romp = [...onder.slice(0, -1), ...boven.slice(0, -1)];
  // Naar buiten schuiven vanaf het midden, met de marge in meters
  const mid = { lat: romp.reduce((s, q) => s + q.lat, 0) / romp.length, lng: romp.reduce((s, q) => s + q.lng, 0) / romp.length };
  const mLat = 111320, mLng = 111320 * Math.cos((mid.lat * Math.PI) / 180);
  return romp.map((q) => {
    const dx = (q.lng - mid.lng) * mLng, dy = (q.lat - mid.lat) * mLat;
    const d = Math.hypot(dx, dy) || 1;
    return { lat: q.lat + ((dy / d) * marge) / mLat, lng: q.lng + ((dx / d) * marge) / mLng };
  });
}

// Alles buiten het speelgebied iets grijzer, zodat teams zien waar het spel zich afspeelt.
// Geeft een functie terug om het gebied bij te werken (als punten veranderen).
export function speelgebiedLaag(L: typeof Leaflet, map: Leaflet.Map) {
  let laag: Leaflet.Polygon | null = null;
  return (punten: Plek[], donker = false, marge = 180) => {
    laag?.remove();
    laag = null;
    const gebied = omhullende(punten, marge);
    if (gebied.length < 3) return;
    const wereld: [number, number][] = [[85, -180], [85, 180], [-85, 180], [-85, -180]];
    try {
      laag = L.polygon([wereld, gebied.map((q): [number, number] => [q.lat, q.lng])], {
        stroke: true, color: donker ? "#A78BFA" : "#7C3AED", weight: 2, opacity: 0.55, dashArray: "6 6",
        fillColor: donker ? "#000000" : "#2A2140", fillOpacity: donker ? 0.35 : 0.18, interactive: false,
      }).addTo(map);
    } catch { /* kaart is intussen weg */ }
  };
}
