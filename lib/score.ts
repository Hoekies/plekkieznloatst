import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// ➕➖ De score van een team. Hij mag onder 0 (migratie 021): een bom, een fout antwoord met minpunten of
// een aftrek van de spelleider kost altijd punten. Zonder die migratie houdt de database hem op 0.
//
// Alles gaat in één stap in de database (migratie 002), zodat twee dingen tegelijk (een antwoord en een bom)
// elkaar niet overschrijven. Is migratie 002 nog niet gedraaid, dan de oude manier: lezen en terugschrijven.
// Een mislukte wijziging geeft een fout (throw), zodat de aanroeper geen succes meldt.

// Bestaat de functie (nog) niet? Dan de oude manier gebruiken.
function geenFunctie(fout: { code?: string; message?: string } | null): boolean {
  return !!fout && (fout.code === "PGRST202" || fout.code === "42883" || /could not find the function|does not exist/i.test(fout.message ?? ""));
}

export async function zetScore(admin: AdminClient, sessieId: string, score: number): Promise<number> {
  const { error } = await admin.from("player_sessions").update({ score }).eq("id", sessieId);
  if (error && score < 0 && /score_check/.test(error.message)) {
    const { error: fout0 } = await admin.from("player_sessions").update({ score: 0 }).eq("id", sessieId);
    if (fout0) throw new Error(fout0.message);
    return 0;
  }
  if (error) throw new Error(error.message);
  return score;
}

// Punten erbij (negatief = eraf); geeft de nieuwe score
export async function telBijScore(admin: AdminClient, sessieId: string, delta: number): Promise<number> {
  const { data, error } = await admin.rpc("pr_score_bij", { p_sessie: sessieId, p_delta: delta });
  if (!error) return typeof data === "number" ? data : Number(data ?? 0);
  // Onder 0 zonder migratie 021: dan op 0
  if (!geenFunctie(error) && !/score_check/.test(error.message)) throw new Error(error.message);
  const { data: rij, error: leesFout } = await admin.from("player_sessions").select("score").eq("id", sessieId).maybeSingle();
  if (leesFout || !rij) throw new Error(leesFout?.message ?? "Sessie niet gevonden");
  return zetScore(admin, sessieId, (rij.score ?? 0) + delta);
}

// 🔄 Twee teams ruilen hun score
export async function wisselScores(admin: AdminClient, a: string, b: string): Promise<void> {
  const { error } = await admin.rpc("pr_score_wissel", { p_a: a, p_b: b });
  if (!error) return;
  if (!geenFunctie(error)) throw new Error(error.message);
  const { data, error: leesFout } = await admin.from("player_sessions").select("id, score").in("id", [a, b]);
  const sa = data?.find((s) => s.id === a)?.score, sb = data?.find((s) => s.id === b)?.score;
  if (leesFout || sa === undefined || sb === undefined) throw new Error(leesFout?.message ?? "Sessie niet gevonden");
  await zetScore(admin, a, sb);
  await zetScore(admin, b, sa);
}

// 🦹 Hoogstens max punten van het ene team naar het andere (nooit meer dan het slachtoffer heeft).
// Geeft terug hoeveel er echt is overgeboekt.
export async function boekScoreOver(admin: AdminClient, van: string, naar: string, max: number): Promise<number> {
  const { data, error } = await admin.rpc("pr_score_overboeken", { p_van: van, p_naar: naar, p_max: max });
  if (!error) return typeof data === "number" ? data : Number(data ?? 0);
  if (!geenFunctie(error)) throw new Error(error.message);
  const { data: rij, error: leesFout } = await admin.from("player_sessions").select("score").eq("id", van).maybeSingle();
  if (leesFout || !rij) throw new Error(leesFout?.message ?? "Sessie niet gevonden");
  const n = Math.max(0, Math.min(max, rij.score ?? 0));
  if (n) { await telBijScore(admin, van, -n); await telBijScore(admin, naar, n); }
  return n;
}

// 🍌 Twee plekken in de volgorde van een team ruilen (via een tijdelijke plek, zodat de unieke regels niet botsen)
export async function ruilPunten(admin: AdminClient, sessieId: string, volgordeA: number, volgordeB: number): Promise<void> {
  const { error } = await admin.rpc("pr_punten_ruilen", { p_sessie: sessieId, p_volgorde_a: volgordeA, p_volgorde_b: volgordeB });
  if (!error) return;
  if (!geenFunctie(error)) throw new Error(error.message);
  // Zonder migratie 002: dezelfde drie stappen, elk gecontroleerd
  const stap = async (van: number, naar: number) => {
    const { data, error: f } = await admin.from("session_point_order").update({ volgorde: naar })
      .eq("session_id", sessieId).eq("volgorde", van).select("id");
    if (f || !data?.length) throw new Error(f?.message ?? `Punt ${van} niet gevonden`);
  };
  await stap(volgordeA, -1);
  try {
    await stap(volgordeB, volgordeA);
  } catch (e) {
    await stap(-1, volgordeA).catch(() => undefined);
    throw e;
  }
  await stap(-1, volgordeB);
}
