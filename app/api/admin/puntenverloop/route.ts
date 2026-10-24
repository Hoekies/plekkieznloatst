import { NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// 📈 Puntenverloop per team van de actieve route: de stand na elke beantwoorde vraag en elke
// correctie door de spelleider. Items (bom, wissel, dief, ster) staan niet los in de database;
// het laatste punt is altijd de echte score, zodat de lijn klopt met de stand.
export async function GET() {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("id").eq("is_active", true).maybeSingle();
  if (!route) return NextResponse.json({ teams: [] });

  type Sessie = { id: string; player_id: string; score: number; status: string; started_at: string | null; finished_at: string | null; players: { login_name: string; nickname: string | null; icon: string | null } };
  const { data: sessiesRaw } = await admin.from("player_sessions")
    .select("id, player_id, score, status, started_at, finished_at, players!inner(login_name, nickname, icon)")
    .eq("route_id", route.id).in("status", ["actief", "voltooid"]);
  const sessies = ((sessiesRaw ?? []) as unknown as Sessie[]).filter((s) => s.started_at);
  const ids = sessies.map((s) => s.id);
  if (!ids.length) return NextResponse.json({ teams: [] });

  const [{ data: antwoorden }, { data: correcties }] = await Promise.all([
    admin.from("player_point_progress").select("session_id, answered_at, points_awarded").in("session_id", ids).not("answered_at", "is", null),
    admin.from("score_correcties").select("session_id, delta, created_at").in("session_id", ids),
  ]);
  const nu = Date.now();
  const teams = sessies.map((s) => {
    const gebeurtenissen = [
      ...(antwoorden ?? []).filter((a) => a.session_id === s.id && a.points_awarded).map((a) => ({ t: Date.parse(a.answered_at as string), d: a.points_awarded as number })),
      ...(correcties ?? []).filter((c) => c.session_id === s.id).map((c) => ({ t: Date.parse(c.created_at as string), d: c.delta as number })),
    ].sort((a, b) => a.t - b.t);
    const start = Date.parse(s.started_at!);
    const eind = s.finished_at ? Date.parse(s.finished_at) : nu;
    const punten: [number, number][] = [[start, 0]];
    let stand = 0;
    for (const g of gebeurtenissen) { stand += g.d; punten.push([g.t, stand]); }
    punten.push([Math.max(eind, punten[punten.length - 1][0]), s.score]);
    return { player_id: s.player_id, naam: s.players.nickname ?? s.players.login_name, icon: s.players.icon, punten };
  });
  return NextResponse.json({ teams });
}
