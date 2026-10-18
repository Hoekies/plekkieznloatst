import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";

// Dichtstbijzijnde plek op een weg of voetpad, via dezelfde voetgangersrouting van OpenStreetMap
// als de lijnen in de route-editor (routing.openstreetmap.de, gratis, geen sleutel).
// Body: { punten: [{ lat, lng }] } → [{ lat, lng, afstand } | null] (null = niet gevonden)
type Plek = { lat: number; lng: number };

async function dichtstbij(p: Plek): Promise<(Plek & { afstand: number }) | null> {
  const url = `https://routing.openstreetmap.de/routed-foot/nearest/v1/foot/${p.lng},${p.lat}?number=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "PointRush route-editor (plekkieznloatst.vercel.app)" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const w = (await res.json())?.waypoints?.[0];
    if (!w?.location) return null;
    const [lng, lat] = w.location as [number, number];
    return { lat, lng, afstand: Math.round(w.distance ?? 0) };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const punten = (Array.isArray(body?.punten) ? body.punten : [])
    .filter((p: Plek) => typeof p?.lat === "number" && typeof p?.lng === "number" && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180)
    .slice(0, 100) as Plek[];

  // Twee tegelijk, om de gratis dienst niet te overvragen
  const uit: ((Plek & { afstand: number }) | null)[] = [];
  for (let i = 0; i < punten.length; i += 2) {
    uit.push(...await Promise.all(punten.slice(i, i + 2).map(dichtstbij)));
  }
  return NextResponse.json({ plekken: uit });
}
