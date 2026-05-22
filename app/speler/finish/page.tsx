import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import FinishScherm from "@/components/speler/FinishScherm";
import type { LeaderboardEntry } from "@/lib/types";

export default async function FinishPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players")
    .select("id, group_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!speler) redirect("/login");

  // Meest recente voltooide sessie
  const { data: sessie } = await admin
    .from("player_sessions")
    .select("*")
    .eq("player_id", speler.id)
    .eq("status", "voltooid")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Geen voltooide sessie → terugsturen
  if (!sessie) {
    const { data: bezig } = await admin
      .from("player_sessions")
      .select("id")
      .eq("player_id", speler.id)
      .eq("status", "actief")
      .maybeSingle();

    redirect(bezig ? "/speler/kaart" : "/speler");
  }

  const tijdSeconden = sessie.finished_at
    ? Math.floor((new Date(sessie.finished_at).getTime() - new Date(sessie.started_at).getTime()) / 1000)
    : 0;

  // Initieel leaderboard ophalen
  type RawSessie = {
    player_id: string;
    score: number;
    started_at: string;
    finished_at: string;
    players: { group_name: string };
  };

  const { data: alleSessies } = await admin
    .from("player_sessions")
    .select("player_id, score, started_at, finished_at, players!inner(group_name)")
    .eq("route_id", sessie.route_id)
    .eq("status", "voltooid")
    .not("finished_at", "is", null);

  const gesorteerd = ((alleSessies ?? []) as unknown as RawSessie[])
    .map((s) => ({
      player_id: s.player_id,
      group_name: s.players.group_name,
      score: s.score,
      tijd_seconden: Math.floor(
        (new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) / 1000
      ),
    }))
    .sort((a, b) => b.score - a.score || a.tijd_seconden - b.tijd_seconden);

  const initLeaderboard: LeaderboardEntry[] = gesorteerd.slice(0, 3).map((s, i) => ({
    rank: i + 1,
    group_name: s.group_name,
    score: s.score,
    tijd_seconden: s.tijd_seconden,
    is_eigen_team: s.player_id === speler.id,
  }));

  return (
    <FinishScherm
      groepNaam={speler.group_name}
      score={sessie.score}
      tijdSeconden={tijdSeconden}
      initLeaderboard={initLeaderboard}
    />
  );
}
