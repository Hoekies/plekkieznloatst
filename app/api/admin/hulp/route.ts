import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Openstaande meldingen "punt niet bereikbaar" — voor de melding op elk admin-scherm
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hulpverzoeken")
    .select("id, session_id, created_at, route_points(name), player_sessions(players(nickname, login_name))")
    .eq("status", "open")
    .order("created_at");
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  type Rij = {
    id: string; session_id: string; created_at: string;
    route_points: { name: string } | { name: string }[] | null;
    player_sessions: { players: { nickname: string | null; login_name: string } | null } | null;
  };
  const meldingen = ((data ?? []) as unknown as Rij[]).map((h) => {
    const punt = Array.isArray(h.route_points) ? h.route_points[0] : h.route_points;
    const speler = h.player_sessions?.players;
    return {
      id: h.id,
      sessie_id: h.session_id,
      team: speler?.nickname ?? speler?.login_name ?? "Een team",
      punt: punt?.name ?? null,
      sinds: h.created_at,
    };
  });

  return NextResponse.json(meldingen);
}
