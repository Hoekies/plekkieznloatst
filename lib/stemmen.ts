import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// 🗳️ Stemvraag: elk team stemt; de keuze met de meeste stemmen wint (bij gelijkspel alle koplopers).
// Teams die met de meerderheid meestemden krijgen de punten van de vraag zodra de stemming sluit.

// Winnende keuze(s) van één stemvraag, uit de stemmen die er nu zijn
export async function stemWinnaars(admin: AdminClient, puntId: string): Promise<{ winnaars: string[]; telling: Map<string, number> }> {
  const { data: stemmen } = await admin.from("player_point_progress").select("selected_answer_id")
    .eq("route_point_id", puntId).not("answered_at", "is", null).not("selected_answer_id", "is", null);
  const telling = new Map<string, number>();
  for (const s of stemmen ?? []) telling.set(s.selected_answer_id as string, (telling.get(s.selected_answer_id as string) ?? 0) + 1);
  const max = Math.max(0, ...telling.values());
  return { winnaars: max ? [...telling].filter(([, n]) => n === max).map(([id]) => id) : [], telling };
}

// Stemming(en) sluiten en de punten uitdelen. Zonder puntId: alle open stemvragen van de route.
// Mag vaker: punten worden bijgesteld met het verschil, nooit dubbel gegeven.
export async function sluitStemmingen(admin: AdminClient, routeId: string, puntId?: string): Promise<number> {
  const { data: punten } = await admin.from("route_points").select("id").eq("route_id", routeId);
  const puntIds = puntId ? [puntId] : (punten ?? []).map((p) => p.id);
  if (!puntIds.length) return 0;
  const { data: vragen, error } = await admin.from("questions").select("id, route_point_id, points, stem_gesloten")
    .eq("type", "stemvraag").in("route_point_id", puntIds);
  if (error) return 0; // migratie 016 nog niet gedraaid: er zijn geen stemvragen
  let gesloten = 0;
  for (const v of vragen ?? []) {
    if (v.stem_gesloten && !puntId) continue;
    const { winnaars } = await stemWinnaars(admin, v.route_point_id);
    const { data: rijen } = await admin.from("player_point_progress").select("id, session_id, selected_answer_id, points_awarded")
      .eq("route_point_id", v.route_point_id).not("answered_at", "is", null);
    for (const r of rijen ?? []) {
      const goed = !!r.selected_answer_id && winnaars.includes(r.selected_answer_id);
      const punten = goed ? v.points : 0;
      const verschil = punten - (r.points_awarded ?? 0);
      await admin.from("player_point_progress").update({ is_correct: goed, points_awarded: punten }).eq("id", r.id);
      if (verschil) {
        const { data: sessie } = await admin.from("player_sessions").select("score").eq("id", r.session_id).maybeSingle();
        await admin.from("player_sessions").update({ score: Math.max(0, (sessie?.score ?? 0) + verschil) }).eq("id", r.session_id);
      }
    }
    await admin.from("questions").update({ stem_gesloten: true }).eq("id", v.id);
    gesloten++;
  }
  return gesloten;
}
