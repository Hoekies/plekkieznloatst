import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

type Params = { params: { id: string } };

// 🔀 Antwoorden husselen voor de hele route (niet per vraag): staat het aan zodra één vraag het heeft; aan- of
// uitzetten geldt voor alle vragen van de route. Nieuwe vragen nemen het over (zie de vraag-API).
// Opgeslagen in questions.antwoorden_husselen (migratie 014).
async function vraagIds(admin: ReturnType<typeof createAdminClient>, routeId: string): Promise<string[]> {
  const { data: punten } = await admin.from("route_points").select("id").eq("route_id", routeId);
  if (!punten?.length) return [];
  const { data } = await admin.from("questions").select("id").in("route_point_id", punten.map((p) => p.id));
  return (data ?? []).map((q) => q.id);
}

export async function GET(_: NextRequest, { params }: Params) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const ids = await vraagIds(admin, params.id);
  if (!ids.length) return NextResponse.json({ aan: false, vragen: 0 });
  const { count, error } = await admin.from("questions").select("id", { count: "exact", head: true }).in("id", ids).eq("antwoorden_husselen", true);
  if (error) return NextResponse.json({ fout: "Draai eerst migratie 014 in Supabase" }, { status: 500 });
  return NextResponse.json({ aan: (count ?? 0) > 0, vragen: ids.length });
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.aan !== "boolean") return NextResponse.json({ fout: "Geef aan of uit op" }, { status: 400 });
  const admin = createAdminClient();
  const ids = await vraagIds(admin, params.id);
  if (ids.length) {
    const { error } = await admin.from("questions").update({ antwoorden_husselen: body.aan }).in("id", ids);
    if (error) return NextResponse.json({ fout: "Draai eerst migratie 014 in Supabase" }, { status: 500 });
  }
  return NextResponse.json({ aan: body.aan, vragen: ids.length });
}
