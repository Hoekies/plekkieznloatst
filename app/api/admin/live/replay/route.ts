import { NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haversine } from "@/lib/geo";

// Replay op de live kaart: het volledige spoor van elk team van de actieve route, met tijden.
// Per team [tijd in ms, lat, lng]; GPS-ruis eruit zoals bij de gelopen route.
export async function GET() {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("id").eq("is_active", true).maybeSingle();
  if (!route) return NextResponse.json({ teams: [] });

  type SessieRij = { id: string; player_id: string; status: string; started_at: string | null; finished_at: string | null; players: { login_name: string; nickname: string | null; icon: string | null } };
  const { data: sessiesRaw } = await admin.from("player_sessions")
    .select("id, player_id, status, started_at, finished_at, players!inner(login_name, nickname, icon)")
    .eq("route_id", route.id).in("status", ["actief", "voltooid"]);
  const sessies = (sessiesRaw ?? []) as unknown as SessieRij[];

  const teams = [];
  for (const s of sessies) {
    // Per 1000 ophalen: de database geeft er niet meer tegelijk
    const rijen: { latitude: number; longitude: number; accuracy_meters: number | null; created_at: string }[] = [];
    for (let van = 0; van < 50000; van += 1000) {
      const { data } = await admin.from("location_updates")
        .select("latitude, longitude, accuracy_meters, created_at")
        .eq("session_id", s.id).order("created_at").range(van, van + 999);
      rijen.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    const spoor: [number, number, number][] = [];
    for (const r of rijen) {
      if ((r.accuracy_meters ?? 0) > 40) continue;
      const vorige = spoor[spoor.length - 1];
      if (vorige && haversine(vorige[1], vorige[2], r.latitude, r.longitude) < 5) continue;
      spoor.push([new Date(r.created_at).getTime(), r.latitude, r.longitude]);
    }
    if (!spoor.length) continue;
    teams.push({
      player_id: s.player_id,
      naam: s.players.nickname ?? s.players.login_name,
      icon: s.players.icon,
      gefinisht_op: s.status === "voltooid" && s.finished_at ? new Date(s.finished_at).getTime() : null,
      spoor,
    });
  }
  return NextResponse.json({ teams });
}
