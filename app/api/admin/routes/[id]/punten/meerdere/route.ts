import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { voegPuntToeAanLopendeSpellen } from "@/lib/route-sessies";
import { IMPORT_START_NAAM, IMPORT_START_TEKST } from "@/lib/punten-import";

// Punten importeren: meerdere punten in één keer, vóór de finish (als die er is). Alleen bij "Op volgorde".
// Ze worden infopunten met dezelfde tekst (bijv. "Punt bereikt! Loop door naar het volgende punt.").
// Body: { punten: [{ lat, lng, naam?, finish? }], beschrijving?, radius_meters? }
// finish (alleen bij het laatste punt): wordt de 🏁 finish, als de route er nog geen heeft
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });

  const body = await request.json().catch(() => null);
  type In = { lat: unknown; lng: unknown; naam?: unknown; finish?: unknown };
  const invoer = Array.isArray(body?.punten) ? body.punten as In[] : [];
  let lijst = invoer
    .map((p, i) => ({ lat: Number(p.lat), lng: Number(p.lng), naam: typeof p.naam === "string" ? p.naam.trim().slice(0, 60) : "", finish: p.finish === true && i === invoer.length - 1 }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);
  if (!lijst.length) return NextResponse.json({ fout: "Geen geldige punten" }, { status: 400 });
  if (lijst.length > 200) return NextResponse.json({ fout: "Maximaal 200 punten per keer" }, { status: 400 });
  const beschrijving = typeof body?.beschrijving === "string" ? body.beschrijving.trim().slice(0, 500) : "";
  const straal = Math.max(5, Math.min(500, Math.round(Number(body?.radius_meters ?? 10)) || 10));

  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("modus").eq("id", params.id).maybeSingle();
  if (!route) return NextResponse.json({ fout: "Route niet gevonden" }, { status: 404 });
  if (route.modus !== "sequentieel") return NextResponse.json({ fout: "Importeren kan alleen bij een route op volgorde" }, { status: 400 });
  const { data: bestaand } = await admin.from("route_points").select("id, type, order_index").eq("route_id", params.id).order("order_index");
  const alle = bestaand ?? [];
  const laatste = alle[alle.length - 1];
  const hoogste = laatste?.order_index ?? 0;
  // Al een finish? Dan blijft die staan en vervalt de finish uit het bestand
  if (laatste?.type === "eindpunt") lijst = lijst.filter((p) => !p.finish);
  if (!lijst.length) return NextResponse.json({ fout: "De route heeft al een finish" }, { status: 400 });

  // Is het laatste punt de finish, dan schuift die op en komen de nieuwe punten ervóór
  let start = hoogste + 1;
  if (laatste?.type === "eindpunt") {
    const { error } = await admin.from("route_points").update({ order_index: hoogste + lijst.length }).eq("id", laatste.id);
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
    start = hoogste;
  }

  // Lege route: het eerste punt is de start (met welkomsttekst); de nummering begint daarna bij 1
  const metStart = alle.length === 0;
  const { data: nieuw, error } = await admin.from("route_points").insert(lijst.map((p, i) => ({
    route_id: params.id,
    order_index: start + i,
    type: p.finish ? "eindpunt" : "informatiepunt",
    name: p.finish ? "Finish" : metStart && i === 0 ? p.naam || IMPORT_START_NAAM : p.naam || `Punt ${metStart ? i : alle.length + i + 1}`,
    latitude: p.lat,
    longitude: p.lng,
    radius_meters: straal,
    points: 0,
    description: p.finish ? null : metStart && i === 0 ? IMPORT_START_TEKST : beschrijving || null,
  }))).select();
  if (error || !nieuw) {
    // Finish terugzetten als het invoegen mislukt
    if (laatste?.type === "eindpunt") await admin.from("route_points").update({ order_index: hoogste }).eq("id", laatste.id);
    return NextResponse.json({ fout: error?.message ?? "Importeren mislukt" }, { status: 500 });
  }

  // Loopt er een spel op deze route? Dan krijgt elk team de nieuwe punten vóór de finish
  for (const p of [...nieuw].sort((a, b) => a.order_index - b.order_index)) {
    await voegPuntToeAanLopendeSpellen(admin, params.id, p.id);
  }
  return NextResponse.json({ ok: true, aantal: nieuw.length }, { status: 201 });
}
