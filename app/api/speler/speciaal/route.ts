import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 403 });

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Speler niet gevonden" }, { status: 403 });

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("route_id")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie) return NextResponse.json([], { status: 200 });

  const { data, error } = await admin
    .from("special_items")
    .select("*")
    .eq("route_id", sessie.route_id)
    .eq("claimed", false);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
