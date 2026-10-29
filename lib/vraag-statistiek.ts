import type { createAdminClient } from "@/lib/supabase-admin";
import { testSessieIds } from "@/lib/testteam";

type AdminClient = ReturnType<typeof createAdminClient>;
// Per punt: hoe vaak beantwoord (n) en hoe vaak goed
export type Telling = Record<string, { n: number; goed: number }>;

// 📊 Vraag-statistiek (migratie 022): per punt hoe vaak de vraag goed ging, over alle gespeelde spellen.
// Tijdens het spel staat het in de antwoorden; bij "Nieuw spel voorbereiden" (reset) tellen we het eerst op
// bij routes.vraag_statistiek, zodat het bewaard blijft als de antwoorden weg zijn.

// De antwoorden die nu in de database staan, per route en per punt (alleen nagekeken antwoorden)
export async function telHuidig(admin: AdminClient, routeId?: string): Promise<Record<string, Telling>> {
  let q = admin.from("player_point_progress").select("route_point_id, is_correct, session_id, player_sessions!inner(route_id)").not("is_correct", "is", null);
  if (routeId) q = q.eq("player_sessions.route_id", routeId);
  const [{ data }, test] = await Promise.all([q.range(0, 19999), testSessieIds(admin)]);
  const uit: Record<string, Telling> = {};
  for (const r of (data ?? []) as unknown as { route_point_id: string; is_correct: boolean; session_id: string; player_sessions: { route_id: string } | { route_id: string }[] }[]) {
    // 🧪 Een testrondje telt niet mee
    if (test.has(r.session_id)) continue;
    const sessie = Array.isArray(r.player_sessions) ? r.player_sessions[0] : r.player_sessions;
    if (!sessie) continue;
    const t = ((uit[sessie.route_id] ??= {})[r.route_point_id] ??= { n: 0, goed: 0 });
    t.n++;
    if (r.is_correct) t.goed++;
  }
  return uit;
}

export function telOp(a: Telling, b: Telling): Telling {
  const uit: Telling = { ...a };
  for (const [punt, t] of Object.entries(b)) uit[punt] = { n: (uit[punt]?.n ?? 0) + t.n, goed: (uit[punt]?.goed ?? 0) + t.goed };
  return uit;
}

// Vóór het wissen van de antwoorden: per route optellen bij wat er al bewaard was. Zonder migratie 022: niets.
export async function bewaarVraagStatistiek(admin: AdminClient) {
  const huidig = await telHuidig(admin);
  for (const [routeId, telling] of Object.entries(huidig)) {
    const { data, error } = await admin.from("routes").select("vraag_statistiek").eq("id", routeId).maybeSingle();
    if (error) return;
    const oud = ((data as { vraag_statistiek?: Telling } | null)?.vraag_statistiek ?? {}) as Telling;
    await admin.from("routes").update({ vraag_statistiek: telOp(oud, telling) }).eq("id", routeId);
  }
}
