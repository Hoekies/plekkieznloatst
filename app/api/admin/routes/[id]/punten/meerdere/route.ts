import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { voegPuntToeAanLopendeSpellen } from "@/lib/route-sessies";

// Punten importeren: meerdere punten in één keer, vóór de finish (als die er is).
// Body: { punten: [{ lat, lng, naam? }], points?, radius_meters? }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });

  const body = await request.json().catch(() => null);
  type In = { lat: unknown; lng: unknown; naam?: unknown };
  const lijst = (Array.isArray(body?.punten) ? body.punten as In[] : [])
    .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng), naam: typeof p.naam === "string" ? p.naam.trim().slice(0, 60) : "" }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);
  if (!lijst.length) return NextResponse.json({ fout: "Geen geldige punten" }, { status: 400 });
  if (lijst.length > 200) return NextResponse.json({ fout: "Maximaal 200 punten per keer" }, { status: 400 });
  const punten = Math.max(-1000, Math.min(1000, Math.round(Number(body?.points ?? 10)) || 0));
  const straal = Math.max(5, Math.min(500, Math.round(Number(body?.radius_meters ?? 10)) || 10));

  const admin = createAdminClient();
  const { data: bestaand } = await admin.from("route_points").select("id, type, order_index").eq("route_id", params.id).order("order_index");
  const alle = bestaand ?? [];
  const laatste = alle[alle.length - 1];
  const hoogste = laatste?.order_index ?? 0;

  // Is het laatste punt de finish, dan schuift die op en komen de nieuwe punten ervóór
  let start = hoogste + 1;
  if (laatste?.type === "eindpunt") {
    const { error } = await admin.from("route_points").update({ order_index: hoogste + lijst.length }).eq("id", laatste.id);
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
    start = hoogste;
  }

  const { data: nieuw, error } = await admin.from("route_points").insert(lijst.map((p, i) => ({
    route_id: params.id,
    order_index: start + i,
    type: "vraagpunt",
    name: p.naam || `Punt ${alle.length + i + 1}`,
    latitude: p.lat,
    longitude: p.lng,
    radius_meters: straal,
    points: punten,
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
