import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { haversine } from "@/lib/geo";
import FinishScherm from "@/components/speler/FinishScherm";
import type { LeaderboardEntry } from "@/lib/types";

export default async function FinishPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players")
    .select("id, login_name, nickname")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!speler) redirect("/login");

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("*")
    .eq("player_id", speler.id)
    .eq("status", "voltooid")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sessie) {
    const { data: bezig } = await admin
      .from("player_sessions")
      .select("id")
      .eq("player_id", speler.id)
      .eq("status", "actief")
      .maybeSingle();

    redirect(bezig ? "/speler/kaart" : "/speler");
  }

  // De finish blijft te zien zolang de route actief is; na "Stop route" terug naar het begin
  const { data: route } = await admin.from("routes").select("*").eq("id", sessie.route_id).maybeSingle();
  if (!route?.is_active) redirect("/speler");
  const uitslagVrij = !!route.uitslag_vrijgegeven;
  const { count: wachtendeFotos } = await admin
    .from("foto_inzendingen")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessie.id)
    .eq("status", "wacht");

  const tijdSeconden = sessie.finished_at
    ? Math.floor((new Date(sessie.finished_at).getTime() - new Date(sessie.started_at).getTime()) / 1000)
    : 0;

  type RawSessie = {
    id: string;
    player_id: string;
    score: number;
    started_at: string;
    finished_at: string;
    players: { login_name: string; nickname: string | null; icon: string | null };
  };

  const { data: alleSessies } = await admin
    .from("player_sessions")
    .select("id, player_id, score, started_at, finished_at, players!inner(login_name, nickname, icon)")
    .eq("route_id", sessie.route_id)
    .eq("status", "voltooid")
    .not("finished_at", "is", null);

  const rawSessies = (alleSessies ?? []) as unknown as RawSessie[];
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

  const gesorteerd = rawSessies
    .map((s) => ({
      sessie_id: s.id,
      player_id: s.player_id,
      display_name: s.players.nickname ?? s.players.login_name,
      icon: s.players.icon,
      score: s.score,
      tijd_seconden: Math.floor(
        (new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) / 1000
      ),
      distance_meters: afstandMap.get(s.id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.tijd_seconden - b.tijd_seconden);

  const initLeaderboard: LeaderboardEntry[] = gesorteerd.map((s, i) => ({
    rank: i + 1,
    display_name: s.display_name,
    icon: s.icon,
    score: s.score,
    tijd_seconden: s.tijd_seconden,
    distance_meters: s.distance_meters,
    is_eigen_team: s.player_id === speler.id,
  }));

  const eigenAfstand = afstandMap.get(sessie.id) ?? 0;
  const displayNaam = speler.nickname ?? speler.login_name;

  return (
    <FinishScherm
      groepNaam={displayNaam}
      score={sessie.score}
      tijdSeconden={tijdSeconden}
      distanceMeters={eigenAfstand}
      initLeaderboard={uitslagVrij ? initLeaderboard : []}
      uitslagVrij={uitslagVrij}
      wachtendeFotos={wachtendeFotos ?? 0}
      itemsNaFinish={!!route.items_na_finish && !uitslagVrij}
      waarden={{
        ster: route.ster_waarde ?? 50,
        bom: route.bom_waarde ?? 30,
        spookSec: route.spook_duur_seconden ?? 600,
        plekzooiSec: route.plekzooi_duur_seconden ?? 300,
      }}
    />
  );
}
