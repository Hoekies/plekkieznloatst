import type { createAdminClient } from "@/lib/supabase-admin";
import { haversine } from "@/lib/geo";
import type { LeaderboardEntry } from "@/lib/types";
import { isTestSpeler, testRol } from "@/lib/testteam";
import { deelPrijzenUit, type Prijs, type TeamCijfers } from "@/lib/prijzen";
import { teamFotos } from "@/lib/teamfoto";

type AdminClient = ReturnType<typeof createAdminClient>;

type RawSessie = {
  id: string; player_id: string; score: number; started_at: string; finished_at: string | null;
  players: { login_name: string; nickname: string | null; icon: string | null; test_rol?: string | null };
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
    .select("id, player_id, score, started_at, finished_at, players!inner(*)")
    .eq("route_id", routeId);
  query = alleenGefinisht ? query.eq("status", "voltooid").not("finished_at", "is", null) : query.in("status", ["actief", "voltooid"]);
  const { data } = await query;
  // 🧪 Een testteam ziet alleen de test (met de testtegenstander), echte teams nooit een test
  const ikTest = eigenSpelerId ? await isTestSpeler(admin, eigenSpelerId) : false;
  const sessies = ((data ?? []) as unknown as RawSessie[]).filter((s) => !!testRol(s.players) === ikTest);
  const afstand = await afstandPerSessie(admin, sessies.map((s) => s.id));
  // Eindstand: de groepsfoto bij de finish als teamfoto
  const fotos = alleenGefinisht ? await teamFotos(admin, routeId, sessies.map((s) => s.id)) : new Map<string, string>();
  const nu = Date.now();
  // 🏆 Eindstand: elk team een titel (snelste, meesterdief, …)
  const prijzen = alleenGefinisht ? await prijzenVoor(admin, sessies, afstand, nu) : new Map<string, Prijs>();
  return sessies
    .map((s) => ({
      player_id: s.player_id,
      prijs: prijzen.get(s.id) ?? null,
      foto: fotos.get(s.id) ?? null,
      display_name: s.players.nickname ?? s.players.login_name,
      icon: s.players.icon,
      score: s.score,
      tijd_seconden: Math.floor(((s.finished_at ? Date.parse(s.finished_at) : nu) - Date.parse(s.started_at)) / 1000),
      distance_meters: afstand.get(s.id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.tijd_seconden - b.tijd_seconden)
    .map((s, i) => ({
      rank: i + 1, display_name: s.display_name, icon: s.icon, foto: s.foto, score: s.score, prijs: s.prijs,
      tijd_seconden: s.tijd_seconden, distance_meters: s.distance_meters, is_eigen_team: s.player_id === eigenSpelerId,
    }));
}

// Cijfers per team voor de prijzen: goede antwoorden, ingezette items en hoe vaak ze geraakt werden
async function prijzenVoor(admin: AdminClient, sessies: RawSessie[], afstand: Map<string, number>, nu: number): Promise<Map<string, Prijs>> {
  const ids = sessies.map((s) => s.id);
  if (!ids.length) return new Map();
  const [{ data: goed }, { data: gebruikt }, { data: geraakt }, { data: stemmen }] = await Promise.all([
    admin.from("player_point_progress").select("session_id").in("session_id", ids).eq("is_correct", true),
    admin.from("item_log").select("gebruiker_session_id, item_type").in("gebruiker_session_id", ids),
    admin.from("item_log").select("doel_session_id, gebruiker_session_id").in("doel_session_id", ids),
    // 📸 Fotobattle (migratie 007; zonder tabel gewoon geen stemmen)
    admin.from("fotobattle_stemmen").select("foto_sessie").in("foto_sessie", ids),
  ]);
  const cijfers: TeamCijfers[] = sessies.map((s) => {
    const items: Record<string, number> = {};
    for (const r of gebruikt ?? []) if (r.gebruiker_session_id === s.id) items[r.item_type] = (items[r.item_type] ?? 0) + 1;
    return {
      id: s.id,
      tijd: Math.floor(((s.finished_at ? Date.parse(s.finished_at) : nu) - Date.parse(s.started_at)) / 1000),
      afstand: afstand.get(s.id) ?? 0,
      goed: (goed ?? []).filter((r) => r.session_id === s.id).length,
      items,
      geraakt: (geraakt ?? []).filter((r) => r.doel_session_id === s.id && r.gebruiker_session_id && r.gebruiker_session_id !== s.id).length,
      stemmen: (stemmen ?? []).filter((r) => r.foto_sessie === s.id).length,
    };
  });
  return deelPrijzenUit(cijfers);
}
