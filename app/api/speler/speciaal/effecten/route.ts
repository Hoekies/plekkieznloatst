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
    .select("id, current_point_id")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie) return NextResponse.json({ ghost: { active: false }, notification: null });

  const now = new Date().toISOString();

  // Actief ghost effect (nog niet verlopen)
  const { data: ghostEffect } = await admin
    .from("special_item_effects")
    .select("id, expires_at, notification")
    .eq("target_session_id", sessie.id)
    .eq("effect_type", "ghost")
    .gt("expires_at", now)
    .order("applied_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Meest recente notification (ook verlopen) voor toast
  const { data: latestNotification } = await admin
    .from("special_item_effects")
    .select("notification, applied_at")
    .eq("target_session_id", sessie.id)
    .not("notification", "is", null)
    .order("applied_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    ghost: ghostEffect
      ? { active: true, expires_at: ghostEffect.expires_at, blocked_point_id: sessie.current_point_id }
      : { active: false },
    notification: latestNotification?.notification ?? null,
    notification_at: latestNotification?.applied_at ?? null,
  });
}
