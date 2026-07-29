import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haversine } from "@/lib/geo";
import type { LeaderboardEntry } from "@/lib/types";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Geen speler" }, { status: 403 });

  const { data: eigenSessie } = await admin
    .from("player_sessions")
    .select("route_id")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();

  let routeId: string | null = eigenSessie?.route_id ?? null;
  if (!routeId) {
    const { data: route } = await admin.from("routes").select("id").eq("is_active", true).maybeSingle();
    routeId = route?.id ?? null;
  }

  if (!routeId) return NextResponse.json({ leaderboard: [] });

  type RawSessie = {
    id: string;
    player_id: string;
    score: number;
    started_at: string;
    finished_at: string | null;
    players: { group_name: string; nickname: string | null };
  };

  const { data: sessies } = await admin
    .from("player_sessions")
    .select("id, player_id, score, started_at, finished_at, players!inner(group_name, nickname)")
    .eq("route_id", routeId)
    .in("status", ["actief", "voltooid"]);

  const rawSessies = (sessies ?? []) as unknown as RawSessie[];
  const sessieIds = rawSessies.map((s) => s.id);

  const afstandMap = new Map<string, number>();
  if (sessieIds.length) {
    const { data: locs } = await admin
      .from("location_updates")
      .select("session_id, latitude, longitude, created_at")
      .in("session_id", sessieIds)
      .order("created_at", { ascending: true });

    const puntenPerSessie = new Map<string, { latitude: number; longitude: number }[]>();
    (locs ?? []).forEach((l) => {
      if (!puntenPerSessie.has(l.session_id)) puntenPerSessie.set(l.session_id, []);
      puntenPerSessie.get(l.session_id)!.push({ latitude: l.latitude, longitude: l.longitude });
    });

    puntenPerSessie.forEach((punten, sessieId) => {
      let totaal = 0;
      for (let i = 1; i < punten.length; i++) {
        totaal += haversine(punten[i - 1].latitude, punten[i - 1].longitude, punten[i].latitude, punten[i].longitude);
      }
      afstandMap.set(sessieId, Math.round(totaal));
    });
  }

  const nu = Date.now();
  const gesorteerd = rawSessies
    .map((s) => ({
      player_id: s.player_id,
      display_name: s.players.nickname ?? s.players.group_name,
      score: s.score,
      tijd_seconden: Math.floor(
        ((s.finished_at ? new Date(s.finished_at).getTime() : nu) - new Date(s.started_at).getTime()) / 1000
      ),
      distance_meters: afstandMap.get(s.id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.tijd_seconden - b.tijd_seconden);

  const leaderboard: LeaderboardEntry[] = gesorteerd.map((s, i) => ({
    rank: i + 1,
    display_name: s.display_name,
    score: s.score,
    tijd_seconden: s.tijd_seconden,
    distance_meters: s.distance_meters,
    is_eigen_team: s.player_id === speler.id,
  }));

  return NextResponse.json({ leaderboard });
}
