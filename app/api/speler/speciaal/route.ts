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

  const { data: route } = await admin
    .from("routes")
    .select("modus, item_respawn, respawn_minuten")
    .eq("id", sessie.route_id)
    .maybeSingle();

  if (route?.modus === "verspreid" && route.item_respawn) {
    const respawnMin = route.respawn_minuten ?? 15;
    const now = new Date().toISOString();
    const vijftienMinGeleden = new Date(Date.now() - respawnMin * 60 * 1000).toISOString();

    // Reset verlopen respawns met willekeurig nieuw type
    const { data: teRespawnen } = await admin
      .from("special_items")
      .select("id, type")
      .eq("route_id", sessie.route_id)
      .eq("claimed", true)
      .not("respawn_at", "is", null)
      .lte("respawn_at", now);

    if (teRespawnen && teRespawnen.length > 0) {
      const { data: alleItems } = await admin
        .from("special_items")
        .select("type")
        .eq("route_id", sessie.route_id);
      const types = (alleItems ?? []).map((i) => i.type as string);

      for (const item of teRespawnen) {
        const willekeurigType = types.length > 0
          ? types[Math.floor(Math.random() * types.length)]
          : item.type;
        await admin.from("special_items")
          .update({ claimed: false, claimed_by_session_id: null, claimed_at: null, respawn_at: null, type: willekeurigType })
          .eq("id", item.id);
      }
    }

    // Race-safe 15-min type rotatie
    const { data: gewonnen } = await admin
      .from("routes")
      .update({ items_last_rotated_at: now })
      .eq("id", sessie.route_id)
      .or(`items_last_rotated_at.is.null,items_last_rotated_at.lt.${vijftienMinGeleden}`)
      .select("id")
      .maybeSingle();

    if (gewonnen) {
      const { data: unclaimedItems } = await admin
        .from("special_items")
        .select("id, type")
        .eq("route_id", sessie.route_id)
        .eq("claimed", false);

      if (unclaimedItems && unclaimedItems.length > 1) {
        const types = unclaimedItems.map((i) => i.type as string);
        for (let i = types.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [types[i], types[j]] = [types[j], types[i]];
        }
        for (let i = 0; i < unclaimedItems.length; i++) {
          await admin.from("special_items").update({ type: types[i] }).eq("id", unclaimedItems[i].id);
        }
      }
    }
  }

  const { data, error } = await admin
    .from("special_items")
    .select("*")
    .eq("route_id", sessie.route_id)
    .eq("claimed", false);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
