import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// ➕➖ De score van een team. Hij mag onder 0 (migratie 021): een bom, een fout antwoord met minpunten of
// een aftrek van de spelleider kost altijd punten. Zonder die migratie houdt de database hem op 0.
export async function zetScore(admin: AdminClient, sessieId: string, score: number): Promise<number> {
  const { error } = await admin.from("player_sessions").update({ score }).eq("id", sessieId);
  if (error && score < 0 && /score_check/.test(error.message)) {
    await admin.from("player_sessions").update({ score: 0 }).eq("id", sessieId);
    return 0;
  }
  return score;
}

// Punten erbij (negatief = eraf), op de score zoals die nu in de database staat
export async function telBijScore(admin: AdminClient, sessieId: string, delta: number): Promise<number> {
  const { data } = await admin.from("player_sessions").select("score").eq("id", sessieId).maybeSingle();
  return zetScore(admin, sessieId, (data?.score ?? 0) + delta);
}
