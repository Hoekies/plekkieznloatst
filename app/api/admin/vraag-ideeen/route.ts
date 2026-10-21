import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { maakVraagIdeeen, type KaartDing } from "@/lib/vraag-ideeen";

// Vraagideeën voor een punt: wat staat er binnen 150 m op de kaart (OpenStreetMap, via Overpass)?
// ?lat=…&lng=… → { ideeen: [{ tekst, type, bij }] }
// De openbare Overpass-servers zijn soms vol: dan de volgende proberen
// Twee pogingen van hooguit 9 s: de functie mag daarom wat langer duren dan standaard
export const maxDuration = 25;
const SERVERS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];

export async function GET(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ fout: "Ongeldige plek" }, { status: 400 });

  const vraag = `[out:json][timeout:10];nwr(around:150,${lat},${lng})[name][~"^(amenity|historic|tourism|leisure|man_made|building|memorial|heritage)$"~"."];out tags 40;`;
  let data: { elements?: { tags?: Record<string, string> }[] } | null = null;
  for (const server of SERVERS) {
    try {
      const res = await fetch(server, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PointRush/1.0 (hoekies.nl)" },
        body: `data=${encodeURIComponent(vraag)}`,
        signal: AbortSignal.timeout(9000),
      });
      if (res.ok) { data = await res.json(); break; }
    } catch { /* volgende server */ }
  }
  if (!data) return NextResponse.json({ fout: "De kaartdienst is even druk, probeer het zo nog eens" }, { status: 502 });

  // Elke naam één keer (een kerk staat er vaak als gebouw én als gebedshuis)
  const gezien = new Set<string>();
  const dingen: KaartDing[] = [];
  for (const el of data.elements ?? []) {
    const naam = el.tags?.name?.trim();
    if (!naam || gezien.has(naam)) continue;
    gezien.add(naam);
    dingen.push({ naam, tags: el.tags ?? {} });
  }
  return NextResponse.json({ ideeen: maakVraagIdeeen(dingen) });
}
