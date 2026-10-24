// 🛣️ Een plek op het dichtstbijzijnde stuk waar je kunt lopen (weg, stoep, voetpad, parkeerterrein), via
// de voetgangersrouting van OpenStreetMap (dezelfde gratis dienst als /api/admin/wegen). Voor items: die
// moeten op de weg liggen, niet in een tuin of tussen huizen. Ligt de dichtstbijzijnde weg verder dan
// maxM weg, of is de dienst niet bereikbaar, dan blijft de plek zoals hij was.
type Plek = { lat: number; lng: number };

export async function opDeWeg(p: Plek, maxM = 60): Promise<Plek> {
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
