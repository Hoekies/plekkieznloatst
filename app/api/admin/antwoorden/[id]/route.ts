import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Een fout (of half goed) antwoord alsnog goedkeuren: het team krijgt de punten van het goede
// antwoord, en het verschil met wat het al kreeg gaat bij de score op.
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data: rij } = await admin
    .from("player_point_progress")
    .select("id, session_id, route_point_id, is_correct, points_awarded")
    .eq("id", params.id)
    .maybeSingle();
  if (!rij) return NextResponse.json({ fout: "Antwoord niet gevonden" }, { status: 404 });
  if (rij.is_correct === true) return NextResponse.json({ fout: "Dit antwoord is al goed" }, { status: 409 });

  const { data: vraag } = await admin
    .from("questions")
    .select("type, points, answer_options(is_correct, punten)")
    .eq("route_point_id", rij.route_point_id)
    .maybeSingle();
  if (!vraag || vraag.type === "foto_opdracht") return NextResponse.json({ fout: "Geen goed te keuren vraag" }, { status: 400 });

  const juiste = (vraag.answer_options as { is_correct: boolean; punten: number | null }[] | null)?.find((o) => o.is_correct);
  const nieuwePunten = (typeof juiste?.punten === "number" ? juiste.punten : null) ?? vraag.points;
  const verschil = nieuwePunten - (rij.points_awarded ?? 0);

  await admin.from("player_point_progress").update({ is_correct: true, points_awarded: nieuwePunten }).eq("id", rij.id);
  if (verschil !== 0) {
    const { data: sessie } = await admin.from("player_sessions").select("score").eq("id", rij.session_id).maybeSingle();
    await admin.from("player_sessions").update({ score: Math.max(0, (sessie?.score ?? 0) + verschil) }).eq("id", rij.session_id);
  }
  return NextResponse.json({ ok: true, punten: nieuwePunten, verschil });
}
