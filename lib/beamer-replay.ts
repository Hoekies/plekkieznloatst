import type { createAdminClient } from "@/lib/supabase-admin";
import { haversine } from "@/lib/geo";

type AdminClient = ReturnType<typeof createAdminClient>;

// 🎬 Replay op de beamer (na het vrijgeven van de uitslag): het gelopen spoor van elk team met de tijd, zodat het
// beamerscherm alle teams tegelijk versneld kan laten lopen. Per punt [lat, lng, ms sinds het eerste team begon].
export type ReplayData = { duur: number; sporen: Record<string, [number, number, number][]> };

// Zoveel punten per team is genoeg voor een vloeiende lijn (en houdt het antwoord klein)
const MAX_PUNTEN = 400;
const rond = (x: number) => Math.round(x * 1e6) / 1e6;

export async function haalReplay(admin: AdminClient, teams: { player_id: string; sessie_id: string }[]): Promise<ReplayData> {
  const ruw = await Promise.all(teams.map(async (t) => {
    // Per 1000 ophalen: de database geeft er niet meer tegelijk
    const rijen: { latitude: number; longitude: number; accuracy_meters: number | null; created_at: string }[] = [];
    for (let van = 0; van < 20000; van += 1000) {
      const { data } = await admin.from("location_updates").select("latitude, longitude, accuracy_meters, created_at")
        .eq("session_id", t.sessie_id).order("created_at").range(van, van + 999);
      rijen.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    // GPS-ruis eruit (zoals bij de gelopen route): onnauwkeurige metingen overslaan en alleen stappen van minstens 5 m
    const spoor: { lat: number; lng: number; t: number }[] = [];
    for (const l of rijen) {
      if ((l.accuracy_meters ?? 0) > 40) continue;
      const vorige = spoor[spoor.length - 1];
      if (vorige && haversine(vorige.lat, vorige.lng, l.latitude, l.longitude) < 5) continue;
      spoor.push({ lat: l.latitude, lng: l.longitude, t: Date.parse(l.created_at) });
    }
    return { id: t.player_id, spoor };
  }));
  const starts = ruw.filter((r) => r.spoor.length > 1).map((r) => r.spoor[0].t);
  if (!starts.length) return { duur: 0, sporen: {} };
  const start = Math.min(...starts);
  let eind = start;
  const sporen: ReplayData["sporen"] = {};
  for (const { id, spoor } of ruw) {
    if (spoor.length < 2) continue;
    const stap = Math.ceil(spoor.length / MAX_PUNTEN);
    sporen[id] = spoor.filter((_, i) => i % stap === 0 || i === spoor.length - 1).map((p) => [rond(p.lat), rond(p.lng), p.t - start]);
    eind = Math.max(eind, spoor[spoor.length - 1].t);
  }
  return { duur: eind - start, sporen };
}
