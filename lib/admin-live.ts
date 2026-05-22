import { createAdminClient } from "@/lib/supabase-admin";

export type SpelerOverzicht = {
  player_id: string;
  group_name: string;
  sessie_id: string | null;
  sessie_status: "geen_sessie" | "actief" | "voltooid" | "vervallen";
  started_at: string | null;
  finished_at: string | null;
  score: number;
  bezochte_punten: number;
  huidig_punt_naam: string | null;
  laatste_gezien: string | null;
  laatste_lat: number | null;
  laatste_lng: number | null;
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
  route: { id: string; name: string } | null;
  route_punten: RoutePuntKort[];
  spelers: SpelerOverzicht[];
};

export async function haalLiveData(): Promise<LiveData> {
  const admin = createAdminClient();

  const [{ data: route }, { data: allePlayers }] = await Promise.all([
    admin.from("routes").select("id, name").eq("is_active", true).maybeSingle(),
    admin.from("players").select("id, group_name").order("group_name"),
  ]);

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
    return { route, route_punten: routePunten, spelers: [] };
  }

  const playerIds = allePlayers.map((p) => p.id);

  const sessiesResult = route
    ? await admin
        .from("player_sessions")
        .select("id, player_id, status, started_at, finished_at, score, current_point_id")
        .eq("route_id", route.id)
        .in("player_id", playerIds)
    : null;
  const sessies = sessiesResult?.data ?? [];

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

  const spelers: SpelerOverzicht[] = allePlayers.map((player) => {
    const sessie = sessieMap.get(player.id);
    const locatie = sessie ? locatieMap.get(sessie.id) : null;
    return {
      player_id: player.id,
      group_name: player.group_name,
      sessie_id: sessie?.id ?? null,
      sessie_status: sessie ? (sessie.status as SpelerOverzicht["sessie_status"]) : "geen_sessie",
      started_at: sessie?.started_at ?? null,
      finished_at: sessie?.finished_at ?? null,
      score: sessie?.score ?? 0,
      bezochte_punten: sessie ? (progressMap.get(sessie.id) ?? 0) : 0,
      huidig_punt_naam: sessie?.current_point_id ? (puntNaam.get(sessie.current_point_id) ?? null) : null,
      laatste_gezien: locatie?.created_at ?? null,
      laatste_lat: locatie?.lat ?? null,
      laatste_lng: locatie?.lng ?? null,
    };
  });

  return { route, route_punten: routePunten, spelers };
}
