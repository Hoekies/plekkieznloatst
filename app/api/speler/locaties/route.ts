import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

import type { SpelerLocatie } from "@/lib/types";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ locaties: [] });

  const { data: eigenSessie } = await admin
    .from("player_sessions")
    .select("id, route_id")
    .eq("player_id", speler.id)
    .in("status", ["actief", "voltooid"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!eigenSessie) return NextResponse.json({ locaties: [] });

  // Andere sessies op dezelfde route (actief of zojuist gefinisht)
  type SessieRij = { id: string; status: string; players: { login_name: string; nickname: string | null } };
  const { data: andereSessies } = await admin
    .from("player_sessions")
    .select("id, status, players!inner(login_name, nickname)")
    .eq("route_id", eigenSessie.route_id)
    .in("status", ["actief", "voltooid"])
    .neq("id", eigenSessie.id);

  const rijen = (andereSessies ?? []) as unknown as SessieRij[];
  if (rijen.length === 0) return NextResponse.json({ locaties: [] });

  const sessieIds = rijen.map((s) => s.id);
  const sessieNaarGroep = new Map(rijen.map((s) => [s.id, s.players.nickname ?? s.players.login_name]));
  const gefinisht = new Set(rijen.filter((s) => s.status === "voltooid").map((s) => s.id));

  // Radar check: heeft de speler een actief radar-effect?
  const { data: radarEffect } = await admin
    .from("special_item_effects")
    .select("id")
    .eq("target_session_id", eigenSessie.id)
    .eq("effect_type", "radar")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  let locaties: SpelerLocatie[];

  if (radarEffect) {
    // Radar actief: exacte coördinaten uit location_updates
    const { data: locatieRows } = await admin
      .from("location_updates")
      .select("session_id, latitude, longitude, created_at")
      .in("session_id", sessieIds)
      .order("created_at", { ascending: false })
      .limit(sessieIds.length * 5);

    const gezien = new Set<string>();
    locaties = [];
    for (const row of locatieRows ?? []) {
      if (gezien.has(row.session_id)) continue;
      gezien.add(row.session_id);
      locaties.push({
        session_id: row.session_id,
        teamnaam: sessieNaarGroep.get(row.session_id) ?? "Onbekend",
        latitude: row.latitude,
        longitude: row.longitude,
        created_at: row.created_at,
        gefinisht: gefinisht.has(row.session_id),
      });
    }
    for (const r of rijen) {
      if (!gezien.has(r.id)) locaties.push({ session_id: r.id, teamnaam: sessieNaarGroep.get(r.id) ?? "Onbekend", latitude: null, longitude: null, created_at: null, gefinisht: gefinisht.has(r.id) });
    }
  } else {
    const { data: route } = await admin.from("routes").select("modus").eq("id", eigenSessie.route_id).maybeSingle();
    if (route?.modus === "mist") {
      // Mist: geen items of radar — globale (afgeronde) posities zoals altijd
      const { data: locatieRows } = await admin
        .from("location_updates")
        .select("session_id, public_latitude, public_longitude, created_at")
        .in("session_id", sessieIds)
        .order("created_at", { ascending: false })
        .limit(sessieIds.length * 5);
      const gezien = new Set<string>();
      locaties = [];
      for (const row of locatieRows ?? []) {
        if (gezien.has(row.session_id)) continue;
        gezien.add(row.session_id);
        locaties.push({
          session_id: row.session_id,
          teamnaam: sessieNaarGroep.get(row.session_id) ?? "Onbekend",
          latitude: row.public_latitude,
          longitude: row.public_longitude,
          created_at: row.created_at,
          gefinisht: gefinisht.has(row.session_id),
        });
      }
    } else {
      // Zonder radar zie je andere teams niet op de kaart: alleen de namen, voor het kiezen
      // van een tegenstander bij een item
      locaties = rijen.map((r) => ({
        session_id: r.id,
        teamnaam: sessieNaarGroep.get(r.id) ?? "Onbekend",
        latitude: null,
        longitude: null,
        created_at: null,
        gefinisht: gefinisht.has(r.id),
      }));
    }
  }

  return NextResponse.json({ locaties });
}
