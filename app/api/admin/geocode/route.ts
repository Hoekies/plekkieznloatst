import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";

const NOMINATIM = { headers: { "User-Agent": "PointRush/1.0 (hoekies.nl)", "Accept-Language": "nl" } };

// ?q=… → plaats of adres zoeken ({ lat, lng })
// ?lat=…&lng=… → naam voor die plek ({ naam }): een bekend gebouw of plek als die er is, anders de straat
// ?lat=…&lng=…&plaats=1 → de plaats (stad, dorp) waar die plek ligt ({ naam })
export async function GET(request: NextRequest) {
  const user = await haalGebruiker();
  if (!user || user.app_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (request.nextUrl.searchParams.has("lat")) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ fout: "Ongeldige plek" }, { status: 400 });
    const plaats = request.nextUrl.searchParams.has("plaats");
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=${plaats ? 14 : 18}&addressdetails=1&lat=${lat}&lon=${lng}`, NOMINATIM);
    if (!res.ok) return NextResponse.json({ fout: "Naam opzoeken lukte niet" }, { status: 502 });
    const d = await res.json() as { name?: string; category?: string; address?: Record<string, string> };
    const a = d.address ?? {};
    if (plaats) {
      const p = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? a.suburb ?? null;
      return p ? NextResponse.json({ naam: p.slice(0, 40) }) : NextResponse.json({ fout: "Geen plaats gevonden" }, { status: 404 });
    }
    // Een eigen naam (kerk, molen, café) gaat voor; een weg of pad heet al zoals de straat
    const eigen = d.name && d.category !== "highway" && d.category !== "place" ? d.name : null;
    const straat = a.road ?? a.pedestrian ?? a.footway ?? a.path ?? a.cycleway ?? a.square ?? a.neighbourhood ?? a.hamlet ?? a.village ?? null;
    const naam = (eigen ?? straat)?.trim().slice(0, 40) ?? null;
    if (!naam) return NextResponse.json({ fout: "Geen naam gevonden" }, { status: 404 });
    return NextResponse.json({ naam });
  }

  const q = request.nextUrl.searchParams.get("q");
  if (!q?.trim()) return NextResponse.json({ fout: "Zoekterm ontbreekt" }, { status: 400 });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q.trim())}`, NOMINATIM);
  const resultaten = await res.json();
  if (!resultaten?.length) return NextResponse.json({ fout: "Plaats niet gevonden" }, { status: 404 });

  return NextResponse.json({ lat: parseFloat(resultaten[0].lat), lng: parseFloat(resultaten[0].lon) });
}
