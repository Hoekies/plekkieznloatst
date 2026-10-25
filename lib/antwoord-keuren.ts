import type { createAdminClient } from "@/lib/supabase-admin";
import { telBijScore } from "@/lib/score";

type AdminClient = ReturnType<typeof createAdminClient>;

// Een fout (of half goed) antwoord alsnog goedkeuren: het team krijgt de punten van het goede
// antwoord, en het verschil met wat het al kreeg gaat bij de score op.
export async function keurAntwoordGoed(admin: AdminClient, voortgangId: string): Promise<{ ok: true; punten: number; verschil: number } | { fout: string; status: number }> {
  const { data: rij } = await admin
    .from("player_point_progress")
    .select("id, session_id, route_point_id, is_correct, points_awarded")
    .eq("id", voortgangId)
    .maybeSingle();
  if (!rij) return { fout: "Antwoord niet gevonden", status: 404 };
  if (rij.is_correct === true) return { fout: "Dit antwoord is al goed", status: 409 };

  const { data: vraag } = await admin
    .from("questions")
    .select("type, points, answer_options(is_correct, punten)")
    .eq("route_point_id", rij.route_point_id)
    .maybeSingle();
  if (!vraag || vraag.type === "foto_opdracht") return { fout: "Geen goed te keuren vraag", status: 400 };

  // Meerdere goede antwoorden kan: het team krijgt de punten van het beste
  const juiste = ((vraag.answer_options as { is_correct: boolean; punten: number | null }[] | null) ?? []).filter((o) => o.is_correct)
    .sort((a, b) => (b.punten ?? vraag.points) - (a.punten ?? vraag.points))[0];
  const nieuwePunten = (typeof juiste?.punten === "number" ? juiste.punten : null) ?? vraag.points;
  const verschil = nieuwePunten - (rij.points_awarded ?? 0);

  await admin.from("player_point_progress").update({ is_correct: true, points_awarded: nieuwePunten }).eq("id", rij.id);
  if (verschil !== 0) await telBijScore(admin, rij.session_id, verschil);
  return { ok: true, punten: nieuwePunten, verschil };
}
