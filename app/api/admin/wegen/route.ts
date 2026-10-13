import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";

// Looproute langs wegen en voetpaden tussen twee punten, via de voetgangersrouting van
// OpenStreetMap (routing.openstreetmap.de, gratis, geen sleutel). Wordt per stuk opgevraagd
// en hier onthouden, zodat de dienst zo weinig mogelijk belast wordt.
type Plek = { lat: number; lng: number };
type Stuk = { afstandM: number; lijn: [number, number][] };

const cache = new Map<string, Stuk | null>();
const sleutel = (a: Plek, b: Plek) => `${a.lat.toFixed(6)},${a.lng.toFixed(6)}>${b.lat.toFixed(6)},${b.lng.toFixed(6)}`;
const geldig = (p: unknown): p is Plek =>
  !!p && typeof (p as Plek).lat === "number" && typeof (p as Plek).lng === "number" &&
  Math.abs((p as Plek).lat) <= 90 && Math.abs((p as Plek).lng) <= 180;

async function haalStuk(a: Plek, b: Plek): Promise<Stuk | null> {
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "PointRush route-editor (plekkieznloatst.vercel.app)" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    return {
      afstandM: Math.round(route.distance),
      lijn: (route.geometry?.coordinates ?? []).map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await haalGebruiker();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const paren = (Array.isArray(body?.paren) ? body.paren : [])
    .filter((p: { a: unknown; b: unknown }) => geldig(p?.a) && geldig(p?.b))
    .slice(0, 80) as { a: Plek; b: Plek }[];

  // vers = herberekenen: niet uit het geheugen, opnieuw opvragen
  const vers = body?.vers === true;
  const uit: Record<string, Stuk | null> = {};
  const nodig = paren.filter((p) => {
    const k = sleutel(p.a, p.b);
    if (!vers && cache.has(k)) { uit[k] = cache.get(k)!; return false; }
    return true;
  });
  // Twee tegelijk, om de gratis dienst niet te overvragen; mislukt een stuk, dan na een korte pauze nog één keer
  for (let i = 0; i < nodig.length; i += 2) {
    await Promise.all(nodig.slice(i, i + 2).map(async ({ a, b }) => {
      const k = sleutel(a, b);
      let stuk = await haalStuk(a, b);
      if (!stuk) { await new Promise((r) => setTimeout(r, 1200)); stuk = await haalStuk(a, b); }
      if (stuk) cache.set(k, stuk);  // mislukt = niet onthouden, later opnieuw proberen
      uit[k] = stuk;
    }));
  }
  return NextResponse.json(uit);
}
