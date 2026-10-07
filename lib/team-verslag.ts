import type { createAdminClient } from "@/lib/supabase-admin";
import { haversine } from "@/lib/geo";

type AdminClient = ReturnType<typeof createAdminClient>;

export type SpoorPunt = { lat: number; lng: number };
export type BezochtPunt = { nr: number; naam: string; lat: number; lng: number };
export type VerslagItem = {
  soort: "ingezet" | "ontvangen";
  type: string;
  ander: string | null;        // tegen wie (ingezet) of van wie (ontvangen)
  omschrijving: string | null;
  tijd: string;
  lat: number | null;
  lng: number | null;
};

export type RouteVerslag = { spoor: SpoorPunt[]; afstandM: number; punten: BezochtPunt[]; items: VerslagItem[] };

// GPS-spoor, bezochte punten en items (op de plek waar ze gebeurden) van één sessie.
// Gebruikt door de kaart "gelopen route" van de speler en het rapport van de beheerder.
export async function haalRouteVerslag(admin: AdminClient, sessieId: string): Promise<RouteVerslag> {
  const [{ data: locaties }, { data: voortgang }, { data: logRijen }] = await Promise.all([
    admin.from("location_updates").select("latitude, longitude, accuracy_meters, created_at").eq("session_id", sessieId).order("created_at"),
    admin.from("player_point_progress").select("reached_at, route_points(name, latitude, longitude)").eq("session_id", sessieId).order("reached_at"),
    admin.from("item_log").select("*").or(`gebruiker_session_id.eq.${sessieId},doel_session_id.eq.${sessieId}`).order("created_at"),
  ]);

  // GPS-ruis eruit: onnauwkeurige metingen overslaan en alleen stappen van minstens 5 m
  const spoor: SpoorPunt[] = [];
  let afstandM = 0;
  for (const l of locaties ?? []) {
    if ((l.accuracy_meters ?? 0) > 40) continue;
    const vorige = spoor[spoor.length - 1];
    const d = vorige ? haversine(vorige.lat, vorige.lng, l.latitude, l.longitude) : Infinity;
    if (d >= 5) {
      if (vorige) afstandM += d;
      spoor.push({ lat: l.latitude, lng: l.longitude });
    }
  }

  type Rij = { route_points: { name: string; latitude: number; longitude: number } | null };
  const punten = ((voortgang ?? []) as unknown as Rij[])
    .filter((v) => v.route_points)
    .map((v, i) => ({ nr: i + 1, naam: v.route_points!.name, lat: v.route_points!.latitude, lng: v.route_points!.longitude }));

  // Namen van de andere teams in het logboek
  type LogRij = {
    gebruiker_session_id: string | null; doel_session_id: string | null; item_type: string;
    omschrijving: string | null; created_at: string;
    latitude?: number | null; longitude?: number | null; doel_latitude?: number | null; doel_longitude?: number | null;
  };
  const rijen = (logRijen ?? []) as LogRij[];
  const andereIds = [...new Set(rijen.flatMap((r) => [r.gebruiker_session_id, r.doel_session_id])
    .filter((id): id is string => !!id && id !== sessieId))];
  const teamNamen = new Map<string, string>();
  if (andereIds.length) {
    const { data: anderen } = await admin.from("player_sessions").select("id, players!inner(login_name, nickname)").in("id", andereIds);
    for (const a of (anderen ?? []) as unknown as { id: string; players: { login_name: string; nickname: string | null } }[]) {
      teamNamen.set(a.id, a.players.nickname ?? a.players.login_name);
    }
  }

  // Plek: ingezet = waar dit team het inzette; ontvangen = waar dit team was toen het geraakt werd.
  // Oudere regels zonder plek: de dichtstbijzijnde GPS-meting in tijd.
  const metTijd = (locaties ?? []).map((l) => ({ lat: l.latitude, lng: l.longitude, t: new Date(l.created_at).getTime() }));
  const schat = (tijd: string) => {
    const t = new Date(tijd).getTime();
    let dichtst: (typeof metTijd)[number] | null = null;
    for (const l of metTijd) if (!dichtst || Math.abs(l.t - t) < Math.abs(dichtst.t - t)) dichtst = l;
    return dichtst;
  };
  const items: VerslagItem[] = rijen.map((r) => {
    const ingezet = r.gebruiker_session_id === sessieId;
    const ander = ingezet ? r.doel_session_id : r.gebruiker_session_id;
    const lat = ingezet ? r.latitude : (r.gebruiker_session_id ? r.doel_latitude : (r.latitude ?? r.doel_latitude));
    const lng = ingezet ? r.longitude : (r.gebruiker_session_id ? r.doel_longitude : (r.longitude ?? r.doel_longitude));
    const plek = lat != null && lng != null ? { lat, lng } : schat(r.created_at);
    return {
      soort: ingezet ? "ingezet" : "ontvangen",
      type: r.item_type,
      ander: ander ? (teamNamen.get(ander) ?? "een ander team") : null,
      omschrijving: r.omschrijving,
      tijd: r.created_at,
      lat: plek?.lat ?? null,
      lng: plek?.lng ?? null,
    };
  });

  return { spoor, afstandM: Math.round(afstandM), punten, items };
}
