import { NextResponse } from "next/server";
import { doelwitNaFinishVan } from "@/lib/item-sessie";
import { haalSpeler } from "@/lib/speler-sessie";

import type { SpelerLocatie } from "@/lib/types";
import { haversine } from "@/lib/geo";

// Zonder radar zie je een ander team alleen als het dichtbij is (en de plekken vers zijn)
const DICHTBIJ_METER = 25;
const DICHTBIJ_MAX_OUD_MS = 2 * 60 * 1000;

export async function GET() {
  const ik = await haalSpeler();
  if (!ik) return NextResponse.json({ locaties: [] });
  const { admin, spelerId } = ik;

  const { data: eigenSessie } = await admin
    .from("player_sessions")
    .select("id, route_id")
    .eq("player_id", spelerId)
    .in("status", ["actief", "voltooid"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!eigenSessie) return NextResponse.json({ locaties: [] });

  // Andere sessies op dezelfde route (actief of zojuist gefinisht)
  type SessieRij = { id: string; status: string; players: { login_name: string; nickname: string | null; icon: string | null } };
  const { data: andereSessies } = await admin
    .from("player_sessions")
    .select("id, status, players!inner(login_name, nickname, icon)")
    .eq("route_id", eigenSessie.route_id)
    .in("status", ["actief", "voltooid"])
    .neq("id", eigenSessie.id);

  const rijen = (andereSessies ?? []) as unknown as SessieRij[];
  if (rijen.length === 0) return NextResponse.json({ locaties: [] });

  const sessieIds = rijen.map((s) => s.id);
  const sessieNaarGroep = new Map(rijen.map((s) => [s.id, s.players.nickname ?? s.players.login_name]));
  const gefinisht = new Set(rijen.filter((s) => s.status === "voltooid").map((s) => s.id));
  const sessieNaarIcoon = new Map(rijen.map((s) => [s.id, s.players.icon ?? null]));

  // Radar check: heeft de speler een actief radar-effect?
  const { data: radarEffect } = await admin
    .from("special_item_effects")
    .select("id")
    .eq("target_session_id", eigenSessie.id)
    .eq("effect_type", "radar")
    .gt("expires_at", new Date().toISOString())
    .limit(1)  // twee radars tegelijk: anders geeft maybeSingle() een fout en lijkt er geen radar
    .maybeSingle();

  let locaties: SpelerLocatie[];

  // Laatste plek van elk team (ook van jezelf, voor "dichtbij")
  const { data: locatieRows } = await admin
    .from("location_updates")
    .select("session_id, latitude, longitude, created_at")
    .in("session_id", [...sessieIds, eigenSessie.id])
    .order("created_at", { ascending: false })
    .limit((sessieIds.length + 1) * 5);
  const laatste = new Map<string, { latitude: number; longitude: number; created_at: string }>();
  for (const row of locatieRows ?? []) if (!laatste.has(row.session_id)) laatste.set(row.session_id, row);
  const eigen = laatste.get(eigenSessie.id);
  const nu = Date.now();
  const recent = (t: string) => nu - new Date(t).getTime() <= DICHTBIJ_MAX_OUD_MS;

  // Zichtbaar op de kaart: iedereen met een actieve radar (2 minuten), en anders alleen teams die
  // nu binnen 25 meter van jou zijn. De rest alleen bij naam (voor het kiezen van een tegenstander).
  locaties = rijen.map((r) => {
    const plek = laatste.get(r.id);
    const dichtbij = !!plek && !!eigen && recent(plek.created_at) && recent(eigen.created_at)
      && haversine(eigen.latitude, eigen.longitude, plek.latitude, plek.longitude) <= DICHTBIJ_METER;
    const zichtbaar = !!plek && (!!radarEffect || dichtbij);
    return {
      session_id: r.id,
      teamnaam: sessieNaarGroep.get(r.id) ?? "Onbekend",
      icon: sessieNaarIcoon.get(r.id) ?? null,
      latitude: zichtbaar ? plek!.latitude : null,
      longitude: zichtbaar ? plek!.longitude : null,
      created_at: zichtbaar ? plek!.created_at : null,
      gefinisht: gefinisht.has(r.id),
    };
  });

  // Welke items gefinishte teams nog mogen raken (instelling "items na de finish")
  const { data: routeInst } = await admin.from("routes").select("*").eq("id", eigenSessie.route_id).maybeSingle();
  return NextResponse.json({ locaties, doelNaFinish: doelwitNaFinishVan(routeInst) });
}
