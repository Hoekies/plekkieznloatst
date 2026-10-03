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

  // Plek zooi wordt niet opgepakt: de val blijft liggen voor de volgende teams.
  // Elk team kan hem één keer raken (UNIQUE special_item_id + target_session_id).
  const { data: val } = await admin
    .from("special_items")
    .select("id, type, points_effect")
    .eq("id", special_item_id)
    .eq("route_id", sessie.route_id)
    .eq("type", "plekzooi")
    .maybeSingle();

  if (val) {
    const { data: routeWaarden } = await admin
      .from("routes").select("plekzooi_duur_seconden").eq("id", sessie.route_id).maybeSingle();
    const duurSeconden = Math.max(10, routeWaarden?.plekzooi_duur_seconden ?? 300);
    const expiresAt = new Date(Date.now() + duurSeconden * 1000).toISOString();
    const { error: effectFout } = await admin.from("special_item_effects").insert({
      special_item_id: val.id,
      target_session_id: sessie.id,
      effect_type: "plekzooi",
      expires_at: expiresAt,
      notification: null,
    });
    if (effectFout) return NextResponse.json({ status: "al_gehad" });
    return NextResponse.json({ status: "plekzooi", expires_at: expiresAt });
  }

  const { data: route } = await admin
    .from("routes")
    .select("modus, item_respawn, respawn_minuten")
    .eq("id", sessie.route_id)
    .maybeSingle();

  // Sequentieel: op de kaart liggen alleen plek-zooi-vallen, er valt niets op te pakken
  if (route?.modus === "sequentieel") return NextResponse.json({ status: "al_geclaimd" });

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
    .eq("is_startitem", false)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  if (!item) return NextResponse.json({ status: "al_geclaimd" });

  // Respawn inplannen als item_respawn aan staat in verspreid-modus
  if (route?.modus === "verspreid" && route.item_respawn) {
    const respawnAt = new Date(Date.now() + (route.respawn_minuten ?? 15) * 60 * 1000).toISOString();
    await admin.from("special_items").update({ respawn_at: respawnAt }).eq("id", special_item_id);
  }

  return NextResponse.json({ status: "geclaimd", item });
}
