import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export type LeaderboardEntry = {
  rank: number;
  group_name: string;
  score: number;
  tijd_seconden: number;
  is_eigen_team: boolean;
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();

  // Eigen speler ophalen
  const { data: speler } = await admin
    .from("players")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!speler) return NextResponse.json({ fout: "Geen speler" }, { status: 403 });

  // Meest recente voltooide sessie van speler → route_id bepalen
  const { data: eigenSessie } = await admin
    .from("player_sessions")
    .select("id, route_id, player_id, score, started_at, finished_at")
    .eq("player_id", speler.id)
    .eq("status", "voltooid")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fallback: actieve route als er nog geen voltooide sessie is
  let routeId: string | null = eigenSessie?.route_id ?? null;
  if (!routeId) {
    const { data: route } = await admin.from("routes").select("id").eq("is_active", true).maybeSingle();
    routeId = route?.id ?? null;
  }

  if (!routeId) return NextResponse.json({ top3: [] });

  // Alle voltooide sessies voor deze route
  const { data: sessies } = await admin
    .from("player_sessions")
    .select("player_id, score, started_at, finished_at, players!inner(group_name)")
    .eq("route_id", routeId)
    .eq("status", "voltooid")
    .not("finished_at", "is", null);

  type RawSessie = {
    player_id: string;
    score: number;
    started_at: string;
    finished_at: string;
    players: { group_name: string };
  };

  const gesorteerd = ((sessies ?? []) as RawSessie[])
    .map((s) => ({
      player_id: s.player_id,
      group_name: s.players.group_name,
      score: s.score,
      tijd_seconden: Math.floor(
        (new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) / 1000
      ),
    }))
    .sort((a, b) => b.score - a.score || a.tijd_seconden - b.tijd_seconden);

  const top3: LeaderboardEntry[] = gesorteerd.slice(0, 3).map((s, i) => ({
    rank: i + 1,
    group_name: s.group_name,
    score: s.score,
    tijd_seconden: s.tijd_seconden,
    is_eigen_team: s.player_id === speler.id,
  }));

  return NextResponse.json({ top3 });
}
