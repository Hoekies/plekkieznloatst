import { NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";

export async function GET() {
  const ctx = await haalSpelerSessie();
  if (!ctx) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 403 });
  const { admin, sessie } = ctx;
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

  // Actief radar effect (eigen sessie heeft radar gebruikt)
  const { data: radarEffect } = await admin
    .from("special_item_effects")
    .select("id, expires_at")
    .eq("target_session_id", sessie.id)
    .eq("effect_type", "radar")
    .gt("expires_at", now)
    .order("applied_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Actief plekzooi effect (eigen sessie heeft een plekzooi geraakt)
  const { data: plekzooiEffect } = await admin
    .from("special_item_effects")
    .select("id, expires_at")
    .eq("target_session_id", sessie.id)
    .eq("effect_type", "plekzooi")
    .gt("expires_at", now)
    .order("applied_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Meest recente notification (ook verlopen) voor toast
  const { data: latestNotification } = await admin
    .from("special_item_effects")
    .select("notification, applied_at, special_item_id")
    .eq("target_session_id", sessie.id)
    .not("notification", "is", null)
    .order("applied_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Wie zette het in? Naam en icoon van dat team, om groot in de melding te tonen
  let van: { naam: string; icon: string | null; sessie: string } | null = null;
  if (latestNotification) {
    const { data: item } = latestNotification.special_item_id
      ? await admin.from("special_items").select("claimed_by_session_id").eq("id", latestNotification.special_item_id).maybeSingle()
      : { data: null };
    let aanvallerSessie = item?.claimed_by_session_id && item.claimed_by_session_id !== sessie.id ? item.claimed_by_session_id : null;
    if (!aanvallerSessie) {
      // Terugval: het logboek (het item kan inmiddels weer op de kaart liggen)
      const { data: log } = await admin.from("item_log").select("gebruiker_session_id")
        .eq("doel_session_id", sessie.id).not("gebruiker_session_id", "is", null)
        .lte("created_at", new Date(new Date(latestNotification.applied_at).getTime() + 60000).toISOString())
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      aanvallerSessie = log?.gebruiker_session_id ?? null;
    }
    if (aanvallerSessie) {
      const { data: a } = await admin.from("player_sessions").select("players!inner(login_name, nickname, icon)").eq("id", aanvallerSessie).maybeSingle();
      const p = a?.players as unknown as { login_name: string; nickname: string | null; icon: string | null } | undefined;
      if (p) van = { naam: p.nickname ?? p.login_name, icon: p.icon, sessie: aanvallerSessie };
    }
  }

  return NextResponse.json({
    ghost: ghostEffect
      ? { active: true, expires_at: ghostEffect.expires_at, blocked_point_id: sessie.current_point_id }
      : { active: false },
    radar: radarEffect
      ? { active: true, expires_at: radarEffect.expires_at }
      : { active: false },
    plekzooi: plekzooiEffect
      ? { active: true, expires_at: plekzooiEffect.expires_at }
      : { active: false },
    notification: latestNotification?.notification ?? null,
    notification_at: latestNotification?.applied_at ?? null,
    notification_van: van,
    // 😤 Voor de wraakknoppen: welk item raakte ons
    notification_item: latestNotification?.special_item_id ?? null,
  });
}
