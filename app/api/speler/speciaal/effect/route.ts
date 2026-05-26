import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const TYPES_MET_DOEL = new Set(["spook", "bom", "wissel", "dief", "banaan"]);

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 403 });

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Speler niet gevonden" }, { status: 403 });

  const { data: eigenSessie } = await admin
    .from("player_sessions")
    .select("id, score")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!eigenSessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const body = await request.json();
  const { special_item_id, target_session_id } = body;
  if (!special_item_id) return NextResponse.json({ fout: "special_item_id ontbreekt" }, { status: 400 });

  // Controleer dat dit item door onze sessie geclaimd is en nog niet gebruikt
  const { data: item } = await admin
    .from("special_items")
    .select("id, type, points_effect")
    .eq("id", special_item_id)
    .eq("claimed_by_session_id", eigenSessie.id)
    .is("used_at", null)
    .maybeSingle();
  if (!item) return NextResponse.json({ fout: "Item niet gevonden, niet door jou geclaimd of al gebruikt" }, { status: 403 });

  // Items met doelkeuze vereisen target_session_id
  if (TYPES_MET_DOEL.has(item.type)) {
    if (!target_session_id) return NextResponse.json({ fout: "target_session_id is verplicht voor dit item" }, { status: 400 });
    if (target_session_id === eigenSessie.id) return NextResponse.json({ fout: "Je kunt jezelf niet targeten" }, { status: 400 });
  }

  let doelSessie: { id: string; score: number } | null = null;
  if (TYPES_MET_DOEL.has(item.type)) {
    const { data: ds } = await admin
      .from("player_sessions")
      .select("id, score")
      .eq("id", target_session_id)
      .eq("status", "actief")
      .maybeSingle();
    if (!ds) return NextResponse.json({ fout: "Doelteam heeft geen actieve sessie" }, { status: 400 });
    doelSessie = ds;
  }

  // Naam van het aanvallende team ophalen voor notificaties
  const { data: aanvallerData } = await admin
    .from("player_sessions")
    .select("players(group_name)")
    .eq("id", eigenSessie.id)
    .maybeSingle();
  const aanvallerNaam: string = (aanvallerData as { players?: { group_name?: string } } | null)?.players?.group_name ?? "Onbekend team";

  const usedAt = new Date().toISOString();
  let eigenNotificatie: string | null = null;

  if (item.type === "ster") {
    const { data: huidig } = await admin.from("player_sessions").select("score").eq("id", eigenSessie.id).maybeSingle();
    await admin.from("player_sessions")
      .update({ score: (huidig?.score ?? eigenSessie.score) + item.points_effect })
      .eq("id", eigenSessie.id);

  } else if (item.type === "verdubbeling") {
    const { error } = await admin.from("special_item_effects").insert({
      special_item_id: item.id,
      target_session_id: eigenSessie.id,
      effect_type: "verdubbeling",
      expires_at: null,
      notification: null,
    });
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  } else if (item.type === "radar") {
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const { error } = await admin.from("special_item_effects").insert({
      special_item_id: item.id,
      target_session_id: eigenSessie.id,
      effect_type: "radar",
      expires_at: expiresAt,
      notification: null,
    });
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  } else if (item.type === "spook") {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await admin.from("special_item_effects").insert({
      special_item_id: item.id,
      target_session_id: doelSessie!.id,
      effect_type: "ghost",
      expires_at: expiresAt,
      notification: `👻 Spook aangeboden door team ${aanvallerNaam}! Je huidige doel is 10 minuten verborgen.`,
    });
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  } else if (item.type === "bom") {
    const aftrek = Math.abs(item.points_effect);
    const { data: huidig } = await admin.from("player_sessions").select("score").eq("id", doelSessie!.id).maybeSingle();
    const nieuweScore = Math.max(0, (huidig?.score ?? doelSessie!.score) - aftrek);
    await admin.from("player_sessions").update({ score: nieuweScore }).eq("id", doelSessie!.id);
    const { error } = await admin.from("special_item_effects").insert({
      special_item_id: item.id,
      target_session_id: doelSessie!.id,
      effect_type: "punt_aftrek",
      expires_at: null,
      notification: `💣 Bom van team ${aanvallerNaam}! Je verliest ${aftrek} punten.`,
    });
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  } else if (item.type === "wissel") {
    const [{ data: eigenHuidig }, { data: doelHuidig }] = await Promise.all([
      admin.from("player_sessions").select("score").eq("id", eigenSessie.id).maybeSingle(),
      admin.from("player_sessions").select("score").eq("id", doelSessie!.id).maybeSingle(),
    ]);
    await Promise.all([
      admin.from("player_sessions").update({ score: doelHuidig?.score ?? doelSessie!.score }).eq("id", eigenSessie.id),
      admin.from("player_sessions").update({ score: eigenHuidig?.score ?? eigenSessie.score }).eq("id", doelSessie!.id),
    ]);
    await admin.from("special_item_effects").insert({
      special_item_id: item.id,
      target_session_id: doelSessie!.id,
      effect_type: "wissel",
      expires_at: null,
      notification: `🔄 Team ${aanvallerNaam} wisselt scores met jou!`,
    });
    eigenNotificatie = `🔄 Je score is gewisseld met team ${(doelSessie as { group_name?: string } | null)?.group_name ?? "het doelteam"}!`;

  } else if (item.type === "dief") {
    const { error } = await admin.from("special_item_effects").insert({
      special_item_id: item.id,
      target_session_id: doelSessie!.id,
      effect_type: "diefstal",
      expires_at: null,
      notification: `🦹 Team ${aanvallerNaam} heeft een dief op je losgelaten! Je volgende punten lopen gevaar.`,
    });
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  } else if (item.type === "banaan") {
    // Haal session_point_order op voor doelteam
    const { data: spo } = await admin
      .from("session_point_order")
      .select("volgorde, route_point_id")
      .eq("session_id", doelSessie!.id)
      .order("volgorde");

    // Hoeveel punten heeft het doelteam al verwerkt?
    const { data: doelVerwerkt } = await admin
      .from("player_point_progress")
      .select("route_point_id")
      .eq("session_id", doelSessie!.id)
      .not("answered_at", "is", null);

    const verwerktIds = new Set((doelVerwerkt ?? []).map((v: { route_point_id: string }) => v.route_point_id));
    const onbezochtSpo = (spo ?? []).filter((s: { route_point_id: string }) => !verwerktIds.has(s.route_point_id));

    if (onbezochtSpo.length < 2) {
      return NextResponse.json({ fout: "Doelteam heeft niet genoeg punten over om te wisselen" }, { status: 400 });
    }

    // Wissel het eerste onbezochte punt met een willekeurig ander onbezocht punt
    const eersteIdx = 0;
    const anderIdx = Math.floor(Math.random() * (onbezochtSpo.length - 1)) + 1;
    const eerste = onbezochtSpo[eersteIdx];
    const ander = onbezochtSpo[anderIdx];

    await Promise.all([
      admin.from("session_point_order")
        .update({ route_point_id: ander.route_point_id })
        .eq("session_id", doelSessie!.id)
        .eq("volgorde", eerste.volgorde),
      admin.from("session_point_order")
        .update({ route_point_id: eerste.route_point_id })
        .eq("session_id", doelSessie!.id)
        .eq("volgorde", ander.volgorde),
    ]);

    const { error } = await admin.from("special_item_effects").insert({
      special_item_id: item.id,
      target_session_id: doelSessie!.id,
      effect_type: "banaan",
      expires_at: null,
      notification: `🍌 Banaan van team ${aanvallerNaam}! Je volgende punt is omgewisseld.`,
    });
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  } else if (item.type === "plekzooi") {
    // Landmijn treft de speler zelf — duur in seconden opgeslagen in points_effect
    const duurSeconden = Math.max(10, item.points_effect);
    const expiresAt = new Date(Date.now() + duurSeconden * 1000).toISOString();
    const { error } = await admin.from("special_item_effects").insert({
      special_item_id: item.id,
      target_session_id: eigenSessie.id,
      effect_type: "plekzooi",
      expires_at: expiresAt,
      notification: null,
    });
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
    await admin.from("special_items").update({ used_at: usedAt }).eq("id", item.id);
    return NextResponse.json({ ok: true, expires_at: expiresAt, eigen_notificatie: null });

  } else {
    return NextResponse.json({ fout: "Onbekend item type" }, { status: 400 });
  }

  // Markeer item als gebruikt
  await admin.from("special_items").update({ used_at: usedAt }).eq("id", item.id);

  return NextResponse.json({ ok: true, eigen_notificatie: eigenNotificatie });
}
