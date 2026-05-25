import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 403 });

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Speler niet gevonden" }, { status: 403 });

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id, route_id")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const body = await request.json();
  const { special_item_id } = body;
  if (!special_item_id) return NextResponse.json({ fout: "special_item_id ontbreekt" }, { status: 400 });

  // Atomische claim: slaagt alleen als het item nog niet geclaimd is
  const { data: item, error } = await admin
    .from("special_items")
    .update({
      claimed: true,
      claimed_by_session_id: sessie.id,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", special_item_id)
    .eq("route_id", sessie.route_id)
    .eq("claimed", false)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  if (!item) return NextResponse.json({ status: "al_geclaimd" });

  return NextResponse.json({ status: "geclaimd", item });
}
