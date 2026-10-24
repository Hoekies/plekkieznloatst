import type { createAdminClient } from "@/lib/supabase-admin";
import { haversine } from "@/lib/geo";
import type { LeaderboardEntry } from "@/lib/types";

type AdminClient = ReturnType<typeof createAdminClient>;

type RawSessie = {
  id: string; player_id: string; score: number; started_at: string; finished_at: string | null;
  players: { login_name: string; nickname: string | null; icon: string | null };
};

// Gelopen afstand per sessie, uit de opgeslagen GPS-plekken
async function afstandPerSessie(admin: AdminClient, sessieIds: string[]): Promise<Map<string, number>> {
  const afstand = new Map<string, number>();
  if (!sessieIds.length) return afstand;
  const { data: locs } = await admin.from("location_updates").select("session_id, latitude, longitude, created_at")
    .in("session_id", sessieIds).order("created_at", { ascending: true });
  const perSessie = new Map<string, { latitude: number; longitude: number }[]>();
  for (const l of locs ?? []) {
    if (!perSessie.has(l.session_id)) perSessie.set(l.session_id, []);
    perSessie.get(l.session_id)!.push(l);
  }
  perSessie.forEach((p, id) => {
    let totaal = 0;
    for (let i = 1; i < p.length; i++) totaal += haversine(p[i - 1].latitude, p[i - 1].longitude, p[i].latitude, p[i].longitude);
    afstand.set(id, Math.round(totaal));
  });
  return afstand;
}

// De stand van een route voor de spelers (eindstand of tussenstand): hoogste score eerst, bij gelijke score de snelste.
// alleenGefinisht: alleen teams die binnen zijn (eindstand); anders ook wie nog onderweg is (tussenstand, tijd tot nu).
// De route van het spel van de speler; zonder spel de route die nu actief is
export async function routeVanSpel(admin: AdminClient, sessie: { route_id: string } | null): Promise<string | null> {
  if (sessie?.route_id) return sessie.route_id;
  const { data: actief } = await admin.from("routes").select("id").eq("is_active", true).maybeSingle();
  return actief?.id ?? null;
}

export async function maakStand(admin: AdminClient, routeId: string, eigenSpelerId: string, alleenGefinisht: boolean): Promise<LeaderboardEntry[]> {
  let query = admin.from("player_sessions")
    .select("id, player_id, score, started_at, finished_at, players!inner(login_name, nickname, icon)")
    .eq("route_id", routeId);
  query = alleenGefinisht ? query.eq("status", "voltooid").not("finished_at", "is", null) : query.in("status", ["actief", "voltooid"]);
  const { data } = await query;
  const sessies = (data ?? []) as unknown as RawSessie[];
  const afstand = await afstandPerSessie(admin, sessies.map((s) => s.id));
  const nu = Date.now();
  return sessies
    .map((s) => ({
      player_id: s.player_id,
      display_name: s.players.nickname ?? s.players.login_name,
      icon: s.players.icon,
      score: s.score,
      tijd_seconden: Math.floor(((s.finished_at ? Date.parse(s.finished_at) : nu) - Date.parse(s.started_at)) / 1000),
      distance_meters: afstand.get(s.id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.tijd_seconden - b.tijd_seconden)
    .map((s, i) => ({
      rank: i + 1, display_name: s.display_name, icon: s.icon, score: s.score,
      tijd_seconden: s.tijd_seconden, distance_meters: s.distance_meters, is_eigen_team: s.player_id === eigenSpelerId,
    }));
}
