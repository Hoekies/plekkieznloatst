import { createAdminClient } from "@/lib/supabase-admin";
import type { SpeciaalItem } from "@/types/database";

export type SpelerOverzicht = {
  player_id: string;
  login_name: string;
  nickname: string | null;
  // Gekozen teamnaam, of de loginnaam zolang het team nog geen naam heeft gekozen
  display_name: string;
  // Heeft de groep nu een telefoon gekoppeld (= ingelogd)?
  ingelogd: boolean;
  sessie_id: string | null;
  sessie_status: "geen_sessie" | "actief" | "voltooid" | "vervallen";
  started_at: string | null;
  finished_at: string | null;
  score: number;
  afstand_m: number;
  bezochte_punten: number;
  huidig_punt_naam: string | null;
  laatste_gezien: string | null;
  laatste_lat: number | null;
  laatste_lng: number | null;
  // Openstaande melding "volgende punt niet bereikbaar"
  hulp: { id: string; punt_naam: string | null; sinds: string } | null;
};

export type RoutePuntKort = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  order_index: number;
};

export type LiveData = {
  route: { id: string; name: string; modus: string } | null;
  route_punten: RoutePuntKort[];
  spelers: SpelerOverzicht[];
  speciale_items: SpeciaalItem[];
  // Gezet als de sessies niet opgehaald konden worden (bv. een migratie die nog niet gedraaid is)
  fout?: string;
};

export function sessietijd(s: SpelerOverzicht): number {
  if (!s.started_at) return 0;
  const eind = s.finished_at ? new Date(s.finished_at).getTime() : Date.now();
  return Math.floor((eind - new Date(s.started_at).getTime()) / 1000);
}

export async function haalLiveData(): Promise<LiveData> {
  const admin = createAdminClient();

  const [{ data: route }, { data: allePlayers }] = await Promise.all([
    admin.from("routes").select("id, name, modus").eq("is_active", true).maybeSingle(),
    admin.from("players").select("id, login_name, nickname, active_device_id").order("login_name"),
  ]);

  let specialeItems: SpeciaalItem[] = [];
  if (route) {
    const { data: items } = await admin
      .from("special_items")
      .select("*")
      .eq("route_id", route.id)
      .order("created_at");
    specialeItems = (items ?? []) as SpeciaalItem[];
  }

  let routePunten: RoutePuntKort[] = [];
  if (route) {
    const { data: punten } = await admin
      .from("route_points")
      .select("id, name, latitude, longitude, type, order_index")
      .eq("route_id", route.id)
      .order("order_index");
    routePunten = punten ?? [];
  }

  if (!allePlayers?.length) {
    return { route, route_punten: routePunten, spelers: [], speciale_items: specialeItems };
  }

  const playerIds = allePlayers.map((p) => p.id);

  const sessiesResult = route
    ? await admin
        .from("player_sessions")
        // "*" i.p.v. losse kolommen: een kolom uit een nog niet gedraaide migratie (zoals afstand_m)
        // mag nooit het hele dashboard leeg maken
        .select("*")
        .eq("route_id", route.id)
        .in("player_id", playerIds)
    : null;
  const sessies = sessiesResult?.data ?? [];
  const fout = sessiesResult?.error ? `Sessies konden niet geladen worden: ${sessiesResult.error.message}` : undefined;

  const sessieMap = new Map((sessies).map((s) => [s.player_id, s]));
  const sessieIds = (sessies).map((s) => s.id);

  const huidigePointIds = [...new Set(
    (sessies).filter((s) => s.current_point_id).map((s) => s.current_point_id as string)
  )];
  const puntNaam = new Map<string, string>();
  if (huidigePointIds.length) {
    const { data: pts } = await admin
      .from("route_points").select("id, name").in("id", huidigePointIds);
    (pts ?? []).forEach((p) => puntNaam.set(p.id, p.name));
  }

  const progressMap = new Map<string, number>();
  if (sessieIds.length) {
    const { data: prog } = await admin
      .from("player_point_progress")
      .select("session_id")
      .in("session_id", sessieIds)
      .not("answered_at", "is", null);
    (prog ?? []).forEach((p) => progressMap.set(p.session_id, (progressMap.get(p.session_id) ?? 0) + 1));
  }

  const locatieMap = new Map<string, { lat: number; lng: number; created_at: string }>();
  if (sessieIds.length) {
    const { data: locs } = await admin
      .from("location_updates")
      .select("session_id, latitude, longitude, created_at")
      .in("session_id", sessieIds)
      .order("created_at", { ascending: false })
      .limit(sessieIds.length * 5);
    const gezien = new Set<string>();
    (locs ?? []).forEach((l) => {
      if (!gezien.has(l.session_id)) {
        gezien.add(l.session_id);
        locatieMap.set(l.session_id, { lat: l.latitude, lng: l.longitude, created_at: l.created_at });
      }
    });
  }

  const hulpMap = new Map<string, SpelerOverzicht["hulp"]>();
  if (sessieIds.length) {
    const { data: hulp } = await admin
      .from("hulpverzoeken")
      .select("id, session_id, created_at, route_points(name)")
      .in("session_id", sessieIds)
      .eq("status", "open");
    (hulp ?? []).forEach((h) => {
      const punt = h.route_points as { name?: string } | { name?: string }[] | null;
      const naam = Array.isArray(punt) ? punt[0]?.name : punt?.name;
      hulpMap.set(h.session_id, { id: h.id, punt_naam: naam ?? null, sinds: h.created_at });
    });
  }

  const spelers: SpelerOverzicht[] = allePlayers.map((player) => {
    const sessie = sessieMap.get(player.id);
    const locatie = sessie ? locatieMap.get(sessie.id) : null;
    return {
      player_id: player.id,
      login_name: player.login_name,
      nickname: player.nickname ?? null,
      display_name: player.nickname ?? player.login_name,
      ingelogd: !!player.active_device_id,
      sessie_id: sessie?.id ?? null,
      sessie_status: sessie ? (sessie.status as SpelerOverzicht["sessie_status"]) : "geen_sessie",
      started_at: sessie?.started_at ?? null,
      finished_at: sessie?.finished_at ?? null,
      score: sessie?.score ?? 0,
      afstand_m: sessie?.afstand_m ?? 0,
      bezochte_punten: sessie ? (progressMap.get(sessie.id) ?? 0) : 0,
      huidig_punt_naam: sessie?.current_point_id ? (puntNaam.get(sessie.current_point_id) ?? null) : null,
      laatste_gezien: locatie?.created_at ?? null,
      laatste_lat: locatie?.lat ?? null,
      laatste_lng: locatie?.lng ?? null,
      hulp: sessie ? (hulpMap.get(sessie.id) ?? null) : null,
    };
  });

  return { route, route_punten: routePunten, spelers, speciale_items: specialeItems, fout };
}
