import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export type SpelerLocatie = {
  session_id: string;
  group_name: string;
  latitude: number;
  longitude: number;
  created_at: string;
};

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
  type SessieRij = { id: string; players: { group_name: string } };
  const { data: andereSessies } = await admin
    .from("player_sessions")
    .select("id, players!inner(group_name)")
    .eq("route_id", eigenSessie.route_id)
    .in("status", ["actief", "voltooid"])
    .neq("id", eigenSessie.id);

  const rijen = (andereSessies ?? []) as unknown as SessieRij[];
  if (rijen.length === 0) return NextResponse.json({ locaties: [] });

  const sessieIds = rijen.map((s) => s.id);
  const sessieNaarGroep = new Map(rijen.map((s) => [s.id, s.players.group_name]));

  // Laatste locatie-update per sessie (meest recente eerst ophalen, dan de-dupliceren)
  const { data: locatieRows } = await admin
    .from("location_updates")
    .select("session_id, public_latitude, public_longitude, created_at")
    .in("session_id", sessieIds)
    .order("created_at", { ascending: false })
    .limit(sessieIds.length * 5);

  const gezien = new Set<string>();
  const locaties: SpelerLocatie[] = [];

  for (const row of locatieRows ?? []) {
    if (gezien.has(row.session_id)) continue;
    gezien.add(row.session_id);
    locaties.push({
      session_id: row.session_id,
      group_name: sessieNaarGroep.get(row.session_id) ?? "Onbekend",
      latitude: row.public_latitude,
      longitude: row.public_longitude,
      created_at: row.created_at,
    });
  }

  return NextResponse.json({ locaties });
}
