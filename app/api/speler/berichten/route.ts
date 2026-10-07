import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Berichten van de organisatie sinds de start van het eigen spel. De spelersapp vraagt dit
// elke paar seconden op (de live-verbinding bleek niet betrouwbaar genoeg).
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ berichten: [] }, { status: 403 });

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ berichten: [] });

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("started_at")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie?.started_at) return NextResponse.json({ berichten: [] });

  const { data } = await admin
    .from("broadcasts")
    .select("id, bericht, created_at")
    .gte("created_at", sessie.started_at)
    .order("created_at", { ascending: true })
    .limit(20);
  return NextResponse.json({ berichten: data ?? [] });
}
