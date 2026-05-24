import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const { status, punten } = await request.json();
  if (status !== "goedgekeurd" && status !== "afgekeurd") {
    return NextResponse.json({ fout: "Ongeldige status" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Haal inzending op
  const { data: inzending } = await admin
    .from("foto_inzendingen")
    .select("id, session_id, route_point_id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!inzending) return NextResponse.json({ fout: "Inzending niet gevonden" }, { status: 404 });
  if (inzending.status !== "wacht") return NextResponse.json({ fout: "Al beoordeeld" }, { status: 409 });

  const puntentoekenend = status === "goedgekeurd" ? (Number(punten) || 0) : 0;

  // Update foto_inzendingen
  await admin.from("foto_inzendingen").update({
    status,
    punten_toegekend: puntentoekenend,
    beoordeeld_op: new Date().toISOString(),
  }).eq("id", params.id);

  // Update player_point_progress: beantwoord markeren
  await admin.from("player_point_progress").upsert({
    session_id: inzending.session_id,
    route_point_id: inzending.route_point_id,
    reached_at: new Date().toISOString(),
    answered_at: new Date().toISOString(),
    is_correct: status === "goedgekeurd",
    points_awarded: puntentoekenend,
  }, { onConflict: "session_id,route_point_id" });

  // Update sessie score
  if (status === "goedgekeurd" && puntentoekenend > 0) {
    const { data: sessie } = await admin
      .from("player_sessions")
      .select("score")
      .eq("id", inzending.session_id)
      .maybeSingle();
    if (sessie) {
      await admin.from("player_sessions")
        .update({ score: sessie.score + puntentoekenend })
        .eq("id", inzending.session_id);
    }
  }

  // Controleer of sessie nu klaar is (alle punten beantwoord)
  const { data: allePunten } = await admin
    .from("player_sessions")
    .select("route_id")
    .eq("id", inzending.session_id)
    .maybeSingle();

  if (allePunten) {
    const [{ count: totaal }, { count: beantwoord }] = await Promise.all([
      admin.from("route_points").select("*", { count: "exact", head: true }).eq("route_id", allePunten.route_id),
      admin.from("player_point_progress").select("*", { count: "exact", head: true })
        .eq("session_id", inzending.session_id).not("answered_at", "is", null),
    ]);
    if (totaal && beantwoord && beantwoord >= totaal) {
      await admin.from("player_sessions").update({
        status: "voltooid",
        finished_at: new Date().toISOString(),
      }).eq("id", inzending.session_id);
    }
  }

  return NextResponse.json({ ok: true });
}
