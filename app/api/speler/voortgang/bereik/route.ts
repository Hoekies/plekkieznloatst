import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function getSessieEnSpeler() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return null;

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("*")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();

  return sessie ? { sessie, speler } : null;
}

export async function POST(request: NextRequest) {
  const context = await getSessieEnSpeler();
  if (!context) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const { sessie } = context;
  const body = await request.json();
  const { route_point_id, qr_secret } = body;
  if (!route_point_id) return NextResponse.json({ fout: "route_point_id ontbreekt" }, { status: 400 });

  const admin = createAdminClient();

  // Controleer of punt bij de route hoort
  const { data: punt } = await admin
    .from("route_points")
    .select("id, route_id, order_index, qr_unlock_enabled, qr_secret")
    .eq("id", route_point_id)
    .eq("route_id", sessie.route_id)
    .maybeSingle();

  if (!punt) return NextResponse.json({ fout: "Ongeldig punt" }, { status: 400 });

  // Controleer of punt nog niet bereikt is
  const { data: bestaand } = await admin
    .from("player_point_progress")
    .select("id")
    .eq("session_id", sessie.id)
    .eq("route_point_id", route_point_id)
    .maybeSingle();

  if (bestaand) return NextResponse.json({ fout: "Punt al bereikt" }, { status: 409 });

  // Controleer volgorde: alle voorgaande punten moeten verwerkt zijn
  const { data: verwerkt } = await admin
    .from("player_point_progress")
    .select("route_point_id")
    .eq("session_id", sessie.id)
    .not("answered_at", "is", null);

  const aantalVerwerkt = verwerkt?.length ?? 0;
  if (punt.order_index !== aantalVerwerkt + 1) {
    return NextResponse.json({ fout: "Volgorde niet correct" }, { status: 400 });
  }

  // Ghost check: is het actieve punt geblokkeerd door een spook-effect?
  const { data: ghostEffect } = await admin
    .from("special_item_effects")
    .select("id")
    .eq("target_session_id", sessie.id)
    .eq("effect_type", "ghost")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (ghostEffect) {
    return NextResponse.json({ fout: "Punt tijdelijk geblokkeerd" }, { status: 423 });
  }

  // QR-verificatie (als qr_secret meegegeven)
  if (qr_secret) {
    if (!punt.qr_unlock_enabled || punt.qr_secret !== qr_secret) {
      return NextResponse.json({ fout: "Ongeldige QR-code voor dit punt" }, { status: 403 });
    }
  }

  // Voortgang invoegen
  const { data: voortgang, error } = await admin
    .from("player_point_progress")
    .insert({
      session_id: sessie.id,
      route_point_id,
      reached_at: new Date().toISOString(),
      points_awarded: 0,
    })
    .select()
    .single();

  if (error || !voortgang) return NextResponse.json({ fout: error?.message }, { status: 500 });

  // Huidige punt bijwerken in sessie
  await admin.from("player_sessions").update({ current_point_id: route_point_id }).eq("id", sessie.id);

  return NextResponse.json(voortgang);
}
