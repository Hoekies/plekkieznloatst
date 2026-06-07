import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Haal alle wachtende foto-inzendingen op met context
  const { data, error } = await admin
    .from("foto_inzendingen")
    .select(`
      id, foto_pad, status, punten_toegekend, created_at,
      session_id,
      route_point_id
    `)
    .eq("status", "wacht")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  if (!data || data.length === 0) return NextResponse.json({ inzendingen: [] });

  // Haal sessie + speler info op
  const sessieIds = [...new Set(data.map((d) => d.session_id))];
  const puntIds = [...new Set(data.map((d) => d.route_point_id))];

  const [{ data: sessies }, { data: punten }, { data: vragen }] = await Promise.all([
    admin.from("player_sessions").select("id, player_id, players!inner(group_name, nickname)").in("id", sessieIds),
    admin.from("route_points").select("id, name").in("id", puntIds),
    admin.from("questions").select("route_point_id, points").in("route_point_id", puntIds).eq("type", "foto_opdracht"),
  ]);

  type SessieRaw = { id: string; player_id: string; players: { group_name: string; nickname: string | null } };
  const sessieMap = new Map((sessies as unknown as SessieRaw[] ?? []).map((s) => [s.id, s]));
  const puntMap = new Map((punten ?? []).map((p) => [p.id, p]));
  const vraagMap = new Map((vragen ?? []).map((v) => [v.route_point_id, v]));

  const inzendingen = data.map((d) => {
    const sessie = sessieMap.get(d.session_id);
    const punt = puntMap.get(d.route_point_id);
    const vraag = vraagMap.get(d.route_point_id);
    return {
      id: d.id,
      foto_pad: d.foto_pad,
      created_at: d.created_at,
      group_name: sessie?.players.nickname ?? sessie?.players.group_name ?? "Onbekend",
      punt_naam: punt?.name ?? "Onbekend",
      max_punten: vraag?.points ?? 0,
      session_id: d.session_id,
    };
  });

  return NextResponse.json({ inzendingen });
}
