import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { spelGepauzeerd, PAUZE_FOUT } from "@/lib/eindtijd";
import { laatItemsVervallen } from "@/lib/items-vervallen";
import { itemsNaFinishVan } from "@/lib/item-sessie";
import { stuurPushNaarBeheer } from "@/lib/push";

async function getSessieEnSpeler() {
  const user = await haalGebruiker();
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
  if (await spelGepauzeerd(createAdminClient(), sessie.route_id)) return NextResponse.json({ fout: PAUZE_FOUT, pauze: true }, { status: 409 });
  const formData = await request.formData();
  const bestand = formData.get("foto") as File | null;
  const routePointId = formData.get("route_point_id") as string | null;

  if (!bestand || !routePointId) {
    return NextResponse.json({ fout: "Foto en route_point_id zijn verplicht" }, { status: 400 });
  }

  // Valideer bestandstype
  const toegestaneTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!toegestaneTypes.includes(bestand.type)) {
    return NextResponse.json({ fout: "Alleen jpeg, png of webp toegestaan" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Controleer of punt bij de route hoort
  const { data: punt } = await admin
    .from("route_points")
    .select("id, type")
    .eq("id", routePointId)
    .eq("route_id", sessie.route_id)
    .maybeSingle();

  if (!punt) return NextResponse.json({ fout: "Ongeldig punt" }, { status: 400 });

  // Alleen een punt dat het team bereikt heeft en nog niet afgerond is
  const { data: voortgangRij } = await admin
    .from("player_point_progress")
    .select("id, answered_at")
    .eq("session_id", sessie.id)
    .eq("route_point_id", routePointId)
    .maybeSingle();
  if (!voortgangRij) return NextResponse.json({ fout: "Je bent nog niet bij dit punt" }, { status: 400 });
  if (voortgangRij.answered_at) return NextResponse.json({ fout: "Dit punt is al afgerond" }, { status: 409 });

  // Controleer of er al een inzending is
  const { data: bestaandeInzending } = await admin
    .from("foto_inzendingen")
    .select("id")
    .eq("session_id", sessie.id)
    .eq("route_point_id", routePointId)
    .maybeSingle();

  if (bestaandeInzending) return NextResponse.json({ fout: "Al een foto ingediend" }, { status: 409 });

  // Upload naar Storage
  const ext = bestand.type === "image/png" ? "png" : bestand.type === "image/webp" ? "webp" : "jpg";
  const pad = `${sessie.id}/${routePointId}.${ext}`;
  const buffer = Buffer.from(await bestand.arrayBuffer());

  const { error: uploadFout } = await admin.storage
    .from("foto-inzendingen")
    .upload(pad, buffer, { contentType: bestand.type, upsert: true });

  if (uploadFout) return NextResponse.json({ fout: uploadFout.message }, { status: 500 });

  // Sessie bijwerken
  await admin.from("player_sessions").update({ current_point_id: routePointId }).eq("id", sessie.id);

  // Foto-inzending aanmaken
  const { data: inzending, error: inzendingFout } = await admin
    .from("foto_inzendingen")
    .insert({
      session_id: sessie.id,
      route_point_id: routePointId,
      foto_pad: pad,
      status: "wacht",
      punten_toegekend: 0,
    })
    .select()
    .single();

  if (inzendingFout) return NextResponse.json({ fout: inzendingFout.message }, { status: 500 });

  // Het team speelt meteen door: het punt is afgerond, de punten komen erbij zodra de
  // beheerder de foto heeft goedgekeurd (vóór de uitslag wordt vrijgegeven).
  const { data: voortgang } = await admin
    .from("player_point_progress")
    .update({ answered_at: new Date().toISOString(), is_correct: null, points_awarded: 0 })
    .eq("id", voortgangRij.id)
    .select()
    .single();

  // Foto-opdracht bij de finish (bijv. een selfie): na het insturen is het team gefinisht.
  // De eindtijd ligt vast; de punten volgen na de keuring.
  if (punt.type === "eindpunt") {
    await admin.from("player_sessions")
      .update({ status: "voltooid", finished_at: new Date().toISOString() })
      .eq("id", sessie.id)
      .eq("status", "actief");
    const { data: finishRoute } = await admin.from("routes").select("*").eq("id", sessie.route_id).maybeSingle();
    await laatItemsVervallen(admin, [sessie.id], { naFinishTypes: itemsNaFinishVan(finishRoute) });
  }

  // Pushmelding naar de beheerder: er is een foto om te keuren
  const { data: team } = await admin.from("players").select("nickname, login_name").eq("id", context.speler.id).maybeSingle();
  await stuurPushNaarBeheer({
    titel: `📸 Nieuwe foto van ${team?.nickname ?? team?.login_name ?? "een team"}`,
    tekst: "Tik om de foto te bekijken en goed of af te keuren.",
    url: "/admin?keuren=1",
    tag: "foto",
  });

  return NextResponse.json({ foto_id: inzending.id, voortgang });
}
