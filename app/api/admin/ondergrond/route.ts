import { NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";

// 🛤️ Ondergrond-check: loopt de route over een trap, onverhard pad of langs een drukke weg?
// Vraagt OpenStreetMap (Overpass) naar zulke wegen in het gebied en legt de route ernaast.
// Handig bij kinderwagens, rolstoelen of jonge kinderen. Alleen een hulpmiddel: OSM is niet overal compleet.
type Plek = { lat: number; lng: number };
type Soort = "trap" | "onverhard" | "drukke weg";
type Weg = { soort: Soort; naam: string | null; punten: Plek[] };

const ONVERHARD = /^(unpaved|gravel|fine_gravel|dirt|earth|ground|grass|sand|mud|pebblestone|woodchips|compacted)$/;
const DRUK = /^(trunk|primary|secondary|trunk_link|primary_link|secondary_link)$/;

// Afstand in meters van p tot het lijnstuk a-b (plat benaderd: prima op deze schaal)
function afstandTotStuk(p: Plek, a: Plek, b: Plek): number {
  const k = Math.cos((p.lat * Math.PI) / 180) * 111320, m = 110540;
  const [px, py, ax, ay, bx, by] = [p.lng * k, p.lat * m, a.lng * k, a.lat * m, b.lng * k, b.lat * m];
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function meter(a: Plek, b: Plek) { return afstandTotStuk(a, b, b); }

export async function POST(request: Request) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const lijnen: Plek[][] = Array.isArray(body?.lijnen) ? body.lijnen.filter((l: unknown) => Array.isArray(l) && l.length > 1).slice(0, 200) : [];
  if (!lijnen.length) return NextResponse.json({ meldingen: [] });

  // Elke 10 meter een meetpunt langs de route
  const meet: Plek[] = [];
  for (const lijn of lijnen) {
    for (let i = 1; i < lijn.length; i++) {
      const a = lijn[i - 1], b = lijn[i], d = meter(a, b), n = Math.max(1, Math.ceil(d / 10));
      for (let j = 0; j < n; j++) meet.push({ lat: a.lat + ((b.lat - a.lat) * j) / n, lng: a.lng + ((b.lng - a.lng) * j) / n });
    }
    meet.push(lijn[lijn.length - 1]);
  }
  if (meet.length > 20000) return NextResponse.json({ fout: "De route is te lang voor deze check" }, { status: 400 });
  const lats = meet.map((p) => p.lat), lngs = meet.map((p) => p.lng);
  const bbox = [Math.min(...lats) - 0.0005, Math.min(...lngs) - 0.0005, Math.max(...lats) + 0.0005, Math.max(...lngs) + 0.0005].map((x) => x.toFixed(5)).join(",");
  const query = `[out:json][timeout:25];(way["highway"="steps"](${bbox});way["highway"]["surface"~"^(unpaved|gravel|fine_gravel|dirt|earth|ground|grass|sand|mud|pebblestone|woodchips|compacted)$"](${bbox});way["highway"~"^(trunk|primary|secondary|trunk_link|primary_link|secondary_link)$"](${bbox}););out geom;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PointRush route-editor" },
    body: "data=" + encodeURIComponent(query), signal: AbortSignal.timeout(30000),
  }).catch(() => null);
  if (!res?.ok) return NextResponse.json({ fout: "OpenStreetMap is nu niet bereikbaar. Probeer het straks opnieuw." }, { status: 502 });
  const osm = await res.json().catch(() => null) as { elements?: { tags?: Record<string, string>; geometry?: { lat: number; lon: number }[] }[] } | null;
  const wegen: Weg[] = (osm?.elements ?? []).filter((e) => e.geometry?.length).map((e) => {
    const t = e.tags ?? {};
    const soort: Soort = t.highway === "steps" ? "trap" : DRUK.test(t.highway ?? "") ? "drukke weg" : ONVERHARD.test(t.surface ?? "") ? "onverhard" : "onverhard";
    return { soort, naam: t.name ?? t.ref ?? null, punten: e.geometry!.map((g) => ({ lat: g.lat, lng: g.lon })) };
  });

  // Per meetpunt: ligt het op (binnen 8 m van) zo'n weg? Aaneengesloten stukken worden één melding
  type Melding = { soort: Soort; naam: string | null; lat: number; lng: number; lengteM: number };
  const meldingen: Melding[] = [];
  let huidig: (Melding & { n: number }) | null = null;
  const sluit = () => {
    if (huidig && (huidig.soort === "trap" || huidig.lengteM >= 20)) meldingen.push({ soort: huidig.soort, naam: huidig.naam, lat: huidig.lat, lng: huidig.lng, lengteM: Math.round(huidig.lengteM) });
    huidig = null;
  };
  for (const p of meet) {
    let treffer: Weg | null = null;
    for (const w of wegen) {
      for (let i = 1; i < w.punten.length; i++) if (afstandTotStuk(p, w.punten[i - 1], w.punten[i]) < 8) { treffer = w; break; }
      if (treffer && treffer.soort === "trap") break;
    }
    if (!treffer) { sluit(); continue; }
    const h: (Melding & { n: number }) | null = huidig;
    if (h && h.soort === treffer.soort && h.naam === treffer.naam) { h.lengteM += 10; h.n++; }
    else { sluit(); huidig = { soort: treffer.soort, naam: treffer.naam, lat: p.lat, lng: p.lng, lengteM: 10, n: 1 }; }
  }
  sluit();
  // Dezelfde plek (heen en terug, meerdere teams) maar één keer
  const uniek = meldingen.filter((m, i) => meldingen.findIndex((x) => x.soort === m.soort && meter(x, m) < 40) === i);
  return NextResponse.json({ meldingen: uniek.slice(0, 40) });
}
