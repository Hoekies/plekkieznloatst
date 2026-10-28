import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Activeert deze route (en zet de andere uit). Spelen er nog teams op een andere actieve route, dan eerst
// een waarschuwing (409 met het aantal); met { toch: true } gaat het alsnog door.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (!isAdmin(user)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const body = await request.json().catch(() => null);
  if (body?.toch !== true) {
    const { data: andere } = await admin.from("routes").select("id, name").eq("is_active", true).neq("id", params.id).maybeSingle();
    if (andere) {
      const { count } = await admin.from("player_sessions").select("id", { count: "exact", head: true }).eq("route_id", andere.id).eq("status", "actief");
      if (count) return NextResponse.json({ fout: "Er wordt nog gespeeld", lopend: count, route: andere.name }, { status: 409 });
    }
  }
  // Bestaat de route nog? Anders niets uitzetten
  const { data: doel } = await admin.from("routes").select("id").eq("id", params.id).maybeSingle();
  if (!doel) return NextResponse.json({ fout: "Deze route bestaat niet (meer)" }, { status: 404 });
  // Welke route stond aan? Mislukt het aanzetten, dan gaat die weer aan (nooit zonder actieve route achterblijven)
  const { data: vorige } = await admin.from("routes").select("id").eq("is_active", true).neq("id", params.id);
  // Deactiveer de andere routes (er mag er maar één actief zijn)
  const { error: uitFout } = await admin.from("routes").update({ is_active: false }).neq("id", params.id).eq("is_active", true);
  if (uitFout) return NextResponse.json({ fout: uitFout.message }, { status: 500 });
  // Activeer deze route
  const { data, error } = await admin
    .from("routes")
    .update({ is_active: true, status: "gepubliceerd", uitslag_vrijgegeven: false })
    .eq("id", params.id)
    .select()
    .single();
  if (error) {
    const terug = (vorige ?? []).map((r) => r.id);
    if (terug.length) await admin.from("routes").update({ is_active: true }).in("id", terug.slice(0, 1));
    return NextResponse.json({ fout: `Route aanzetten lukte niet: ${error.message}. De vorige route staat weer aan.` }, { status: 500 });
  }
  return NextResponse.json(data);
}
