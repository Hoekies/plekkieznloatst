import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { telBijScore } from "@/lib/score";

// 🧑‍⚖️ Beslissen over een bezwaar: POST { id, besluit: "toekennen" | "afwijzen" }. Toekennen = het antwoord telt als
// goed met de punten van de vraag. Het team krijgt een bericht. Mag ook een helper.
export async function POST(request: NextRequest) {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { id?: string; besluit?: string };
  const toekennen = body.besluit === "toekennen";
  if (!toekennen && body.besluit !== "afwijzen") return NextResponse.json({ fout: "Kies toekennen of afwijzen" }, { status: 400 });
  const admin = createAdminClient();
  const { data: b } = await admin.from("bezwaren").select("*, route_points(name, questions(points))").eq("id", String(body.id ?? "")).maybeSingle();
  if (!b) return NextResponse.json({ fout: "Bezwaar niet gevonden" }, { status: 404 });
  const punt = b.route_points as unknown as { name: string; questions: { points: number }[] | { points: number } | null } | null;
  const vraag = Array.isArray(punt?.questions) ? punt?.questions[0] : punt?.questions;
  const punten = toekennen ? Math.max(0, vraag?.points ?? 0) : 0;
  // Eén keer beslissen: alleen als het bezwaar nog open staat
  const { data: gezet } = await admin.from("bezwaren").update({ status: toekennen ? "toegekend" : "afgewezen", punten, beslist_op: new Date().toISOString() })
    .eq("id", b.id).eq("status", "open").select("id");
  if (!gezet?.length) return NextResponse.json({ fout: "Over dit bezwaar is al beslist" }, { status: 409 });
  if (toekennen) {
    await admin.from("player_point_progress").update({ is_correct: true, points_awarded: punten }).eq("session_id", b.sessie_id).eq("route_point_id", b.route_point_id);
    if (punten) await telBijScore(admin, b.sessie_id, punten).catch(() => undefined);
  }
  const { data: s } = await admin.from("player_sessions").select("player_id").eq("id", b.sessie_id).maybeSingle();
  if (s?.player_id) {
    await admin.from("broadcasts").insert({
      player_id: s.player_id,
      bericht: (toekennen ? `🧑‍⚖️ Bezwaar toegekend (${punt?.name ?? "punt"}): +${punten} punten` : `🧑‍⚖️ Bezwaar afgewezen (${punt?.name ?? "punt"})`).slice(0, 150),
    });
  }
  return NextResponse.json({ ok: true, punten });
}
