import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(
  _: NextRequest,
  { params }: { params: { pid: string } }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 401 });

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Speler niet gevonden" }, { status: 404 });

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();

  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const { data: inzending } = await admin
    .from("foto_inzendingen")
    .select("status, punten_toegekend")
    .eq("session_id", sessie.id)
    .eq("route_point_id", params.pid)
    .maybeSingle();

  if (!inzending) return NextResponse.json({ status: null }, { status: 404 });

  return NextResponse.json({ status: inzending.status, punten_toegekend: inzending.punten_toegekend });
}
