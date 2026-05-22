import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { normaliserenNumeriek } from "@/lib/geo";

async function getActieveSessie() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return null;
  const { data: sessie } = await admin
    .from("player_sessions").select("*").eq("player_id", speler.id).eq("status", "actief").maybeSingle();
  return sessie ?? null;
}

function normaliserenTekst(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(request: NextRequest) {
  const sessie = await getActieveSessie();
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const body = await request.json();
  const { route_point_id, selected_answer_id, open_answer_text } = body;
  if (!route_point_id) return NextResponse.json({ fout: "route_point_id ontbreekt" }, { status: 400 });

  const admin = createAdminClient();

  const { data: punt } = await admin
    .from("route_points")
    .select("id, points, type")
    .eq("id", route_point_id)
    .eq("route_id", sessie.route_id)
    .maybeSingle();

  if (!punt) return NextResponse.json({ fout: "Ongeldig punt" }, { status: 400 });

  const { data: bestaand } = await admin
    .from("player_point_progress")
    .select("id, answered_at")
    .eq("session_id", sessie.id)
    .eq("route_point_id", route_point_id)
    .maybeSingle();

  if (!bestaand) return NextResponse.json({ fout: "Punt nog niet bereikt" }, { status: 400 });
  if (bestaand.answered_at) return NextResponse.json({ fout: "Punt al verwerkt" }, { status: 409 });

  // ── Antwoord controleren ──────────────────────────────────────────────────
  let isCorrect: boolean | null = null;
  let puntWaarde = 0;

  // Feedback-info die teruggestuurd wordt voor de UI
  let correctAnswerId: string | null = null;
  let correctTextAnswers: string[] | null = null;
  let numericAnswer: number | null = null;
  let numericTolerance: number | null = null;

  if (punt.type === "informatiepunt" || punt.type === "eindpunt") {
    isCorrect = true;
    puntWaarde = punt.points;
  } else {
    // Vraagpunt — vraag ophalen
    const { data: vraag } = await admin
      .from("questions")
      .select("*, answer_options(*)")
      .eq("route_point_id", route_point_id)
      .order("order_index", { referencedTable: "answer_options" })
      .maybeSingle();

    if (!vraag) {
      // Vraagpunt zonder vraag → doorgaan als informatiepunt
      isCorrect = true;
      puntWaarde = punt.points;
    } else if (vraag.type === "meerkeuze_tekst" || vraag.type === "meerkeuze_afbeelding") {
      if (!selected_answer_id) return NextResponse.json({ fout: "Geen antwoord opgegeven" }, { status: 400 });

      const gekozen = vraag.answer_options.find((a: { id: string }) => a.id === selected_answer_id);
      if (!gekozen) return NextResponse.json({ fout: "Ongeldig antwoord" }, { status: 400 });

      isCorrect = gekozen.is_correct;
      puntWaarde = isCorrect ? vraag.points : 0;
      correctAnswerId = vraag.answer_options.find((a: { is_correct: boolean }) => a.is_correct)?.id ?? null;
    } else if (vraag.type === "open") {
      if (open_answer_text === undefined || open_answer_text === null) {
        return NextResponse.json({ fout: "Geen antwoord opgegeven" }, { status: 400 });
      }

      if (vraag.numeric_answer !== null) {
        // Numeriek
        const ingevoerd = normaliserenNumeriek(open_answer_text);
        const tolerantie = vraag.numeric_tolerance ?? 0;
        isCorrect = ingevoerd !== null && Math.abs(ingevoerd - vraag.numeric_answer) <= tolerantie;
        numericAnswer = vraag.numeric_answer;
        numericTolerance = tolerantie;
      } else {
        // Tekst
        const genorm = normaliserenTekst(open_answer_text);
        const correcte = (vraag.correct_text_answers ?? []).map(normaliserenTekst);
        isCorrect = correcte.includes(genorm);
        correctTextAnswers = vraag.correct_text_answers ?? [];
      }
      puntWaarde = isCorrect ? vraag.points : 0;
    }
  }

  // ── Voortgang opslaan ─────────────────────────────────────────────────────
  const { data: bijgewerkt, error } = await admin
    .from("player_point_progress")
    .update({
      answered_at: new Date().toISOString(),
      selected_answer_id: selected_answer_id ?? null,
      open_answer_text: open_answer_text ?? null,
      is_correct: isCorrect,
      points_awarded: puntWaarde,
    })
    .eq("id", bestaand.id)
    .select()
    .single();

  if (error || !bijgewerkt) return NextResponse.json({ fout: error?.message }, { status: 500 });

  // Score bijwerken — lees huidige score opnieuw om stale read te vermijden
  if (puntWaarde > 0) {
    const { data: huidig } = await admin.from("player_sessions").select("score").eq("id", sessie.id).maybeSingle();
    await admin.from("player_sessions").update({ score: (huidig?.score ?? sessie.score) + puntWaarde }).eq("id", sessie.id);
  }

  // Eindpunt → sessie sluiten
  if (punt.type === "eindpunt") {
    await admin
      .from("player_sessions")
      .update({ status: "voltooid", finished_at: new Date().toISOString() })
      .eq("id", sessie.id);
  }

  return NextResponse.json({
    voortgang: bijgewerkt,
    is_correct: isCorrect,
    points_awarded: puntWaarde,
    correct_answer_id: correctAnswerId,
    correct_text_answers: correctTextAnswers,
    numeric_answer: numericAnswer,
    numeric_tolerance: numericTolerance,
  });
}
