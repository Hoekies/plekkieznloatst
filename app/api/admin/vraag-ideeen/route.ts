import { vraagOverpass } from "@/lib/overpass";
import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { maakVraagIdeeen, type KaartDing } from "@/lib/vraag-ideeen";

// Vraagideeën voor een punt: wat staat er binnen 150 m op de kaart (OpenStreetMap, via Overpass)?
// ?lat=…&lng=… → { ideeen: [{ tekst, type, bij }] }
// De openbare Overpass-servers zijn soms vol: dan de volgende proberen
// Twee pogingen van hooguit 9 s: de functie mag daarom wat langer duren dan standaard
export const maxDuration = 25;

export async function GET(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ fout: "Ongeldige plek" }, { status: 400 });

  const vraag = `[out:json][timeout:10];nwr(around:150,${lat},${lng})[name][~"^(amenity|historic|tourism|leisure|man_made|building|memorial|heritage)$"~"."];out tags 40;`;
  const data = await vraagOverpass<{ elements?: { tags?: Record<string, string> }[] }>(vraag, 9000);
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
