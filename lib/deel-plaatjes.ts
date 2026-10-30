import type { createAdminClient } from "@/lib/supabase-admin";
import { maakStand } from "@/lib/stand";
import { spelStatistieken, type TeamStatistiek, type Record_ } from "@/lib/statistieken";
import { haalReplay } from "@/lib/beamer-replay";
import { haalRouteVerslag } from "@/lib/team-verslag";
import { huisLogoUrl } from "@/lib/huisstijl";
import { testRol } from "@/lib/test-rol";
import { maakKleurMap } from "@/lib/speler-kleur";
import { teamFotos } from "@/lib/teamfoto";
import { plezierInstellingen } from "@/lib/spelplezier";

type AdminClient = ReturnType<typeof createAdminClient>;

// 🖼️ Gegevens voor de deelplaatjes na afloop (alleen plaatjes, geen losse tekst):
// - groep (de spelleider): uitslag en cijfers, routeposter, prijzenuitreiking, rivaliteitenkaart;
// - team (de speler, na de uitslag): teamkaart en "ons rondje".
// Alleen echte teams (geen 🧪 test).

export type GroepTeam = {
  sessie: string; naam: string; icon: string | null; foto: string | null; kleur: string;
  rank: number; score: number; prijs: { emoji: string; titel: string; uitleg: string } | null;
  stat: TeamStatistiek | null; spoor: [number, number][];
};
export type GroepPlaatjes = {
  route: string; huis_logo: string | null; datum: string;
  teams: GroepTeam[];
  punten: { lat: number; lng: number; type: string }[];
  records: Record_[];
  rivaliteit: { van: string; naar: string; aantal: number; item: string }[];   // sessie-id's; item = het meest gebruikte
};

const datumNu = () => new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" });

export async function groepPlaatjes(admin: AdminClient, routeId: string): Promise<GroepPlaatjes> {
  const [{ data: route }, { data: spellen }, stand, stats, { data: punten }] = await Promise.all([
    admin.from("routes").select("*").eq("id", routeId).maybeSingle(),
    admin.from("player_sessions").select("id, player_id, started_at, finished_at, afstand_m, players!inner(*)").eq("route_id", routeId).in("status", ["actief", "voltooid"]),
    maakStand(admin, routeId, "", true),
    spelStatistieken(admin, routeId, ""),
    admin.from("route_points").select("latitude, longitude, type, order_index").eq("route_id", routeId).order("order_index"),
  ]);
  const echt = (spellen ?? []).filter((s) => !testRol(s.players));
  const naamVan = (s: (typeof echt)[number]) => {
    const p = s.players as unknown as { nickname: string | null; login_name: string; icon: string | null };
    return { naam: p.nickname ?? p.login_name, icon: p.icon };
  };
  const kleuren = maakKleurMap(echt.map((s) => s.player_id));
  const replay = await haalReplay(admin, echt.map((s) => ({ player_id: s.player_id, sessie_id: s.id })));
  const ids = echt.map((s) => s.id);

  const teams: GroepTeam[] = echt.map((s) => {
    const { naam, icon } = naamVan(s);
    const e = stand.find((x) => x.display_name === naam);
    return {
      sessie: s.id, naam, icon, foto: e?.foto ?? null, kleur: kleuren.get(s.player_id) ?? "#F97316",
      rank: e?.rank ?? 99, score: e?.score ?? 0, prijs: e?.prijs ?? null,
      stat: stats.perTeam.find((t) => t.sessie === s.id)?.stat ?? null,
      spoor: (replay.sporen[s.player_id] ?? []).map((p): [number, number] => [p[0], p[1]]),
    };
  }).sort((a, b) => a.rank - b.rank);

  // Rivaliteit (wie gooide wat op wie)
  const { data: log } = ids.length ? await admin.from("item_log").select("gebruiker_session_id, doel_session_id, item_type").in("gebruiker_session_id", ids) : { data: [] };
  const paren = new Map<string, Record<string, number>>();
  for (const l of log ?? []) {
    if (!l.doel_session_id || !ids.includes(l.doel_session_id) || l.doel_session_id === l.gebruiker_session_id) continue;
    const sleutel = `${l.gebruiker_session_id}|${l.doel_session_id}`;
    const m = paren.get(sleutel) ?? {};
    m[l.item_type] = (m[l.item_type] ?? 0) + 1;
    paren.set(sleutel, m);
  }
  const rivaliteit = [...paren].map(([k, m]) => {
    const [van, naar] = k.split("|");
    const [item] = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    return { van, naar, aantal: Object.values(m).reduce((a, b) => a + b, 0), item };
  }).sort((a, b) => b.aantal - a.aantal).slice(0, 12);

  return {
    route: (route?.name as string | undefined) ?? "PointRush", huis_logo: huisLogoUrl(route), datum: datumNu(),
    teams, records: stats.records, rivaliteit,
    punten: (punten ?? []).map((p) => ({ lat: p.latitude, lng: p.longitude, type: p.type })),
  };
}

export type TeamPlaatjes = {
  route: string; huis_logo: string | null; datum: string;
  naam: string; icon: string | null; foto: string | null;
  plaats: number | null; aantal: number; score: number; minuten: number; km: number;
  prijs: { emoji: string; titel: string } | null;
  badges: string[]; mascotte: boolean; levels: boolean;
  stat: TeamStatistiek | null;
  spoor: [number, number][]; punten: { lat: number; lng: number; nr: number }[];
};

export async function teamPlaatjes(admin: AdminClient, sessie: { id: string; route_id: string; player_id: string; score?: number; started_at?: string; finished_at?: string | null }): Promise<TeamPlaatjes> {
  const [{ data: route }, { data: speler }, stand, stats, verslag, fotos, { data: badges }] = await Promise.all([
    admin.from("routes").select("*").eq("id", sessie.route_id).maybeSingle(),
    admin.from("players").select("nickname, login_name, icon").eq("id", sessie.player_id).maybeSingle(),
    maakStand(admin, sessie.route_id, sessie.player_id, true),
    spelStatistieken(admin, sessie.route_id, sessie.id),
    haalRouteVerslag(admin, sessie.id),
    teamFotos(admin, sessie.route_id, [sessie.id]),
    admin.from("badges").select("soort").eq("sessie_id", sessie.id).order("created_at"),
  ]);
  const inst = plezierInstellingen(route);
  const eigen = stand.find((e) => e.is_eigen_team);
  const start = sessie.started_at ? Date.parse(sessie.started_at) : NaN, eind = sessie.finished_at ? Date.parse(sessie.finished_at) : Date.now();
  return {
    route: (route?.name as string | undefined) ?? "PointRush", huis_logo: huisLogoUrl(route), datum: datumNu(),
    naam: speler?.nickname ?? speler?.login_name ?? "Ons team", icon: speler?.icon ?? null, foto: fotos.get(sessie.id) ?? null,
    plaats: eigen?.rank ?? null, aantal: stand.length, score: sessie.score ?? eigen?.score ?? 0,
    minuten: Number.isFinite(start) ? Math.round((eind - start) / 60000) : 0,
    km: Math.round(verslag.afstandM / 100) / 10,
    prijs: eigen?.prijs ? { emoji: eigen.prijs.emoji, titel: eigen.prijs.titel } : null,
    badges: (badges ?? []).map((b) => b.soort as string), mascotte: inst.mascotte.aan, levels: inst.levels.aan,
    stat: stats.eigen,
    spoor: verslag.spoor.map((p): [number, number] => [p.lat, p.lng]),
    punten: verslag.punten.map((p) => ({ lat: p.lat, lng: p.lng, nr: p.nr })),
  };
}
