import { NextRequest, NextResponse } from "next/server";
import { spelGepauzeerd, PAUZE_FOUT, rondAfAlsTijdVoorbij, eindtijdVoorbij } from "@/lib/eindtijd";
import { laatItemsVervallen } from "@/lib/items-vervallen";
import { itemsNaFinishVan } from "@/lib/item-sessie";
import { stuurPushNaarBeheer } from "@/lib/push";
import { haalSpelerSessie } from "@/lib/speler-sessie";

export async function POST(request: NextRequest) {
  const ctx = await haalSpelerSessie();
  if (!ctx?.sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });
  const admin = ctx.admin, sessie = ctx.sessie;
  // Zelfde regels als een gewoon antwoord: na de eindtijd telt niets meer mee, en niet tijdens een pauze
  const tijd = await rondAfAlsTijdVoorbij(admin, sessie.route_id);
  if (eindtijdVoorbij(tijd)) return NextResponse.json({ fout: "Het spel is afgelopen: de eindtijd is voorbij" }, { status: 403 });
  if (tijd.pauze || await spelGepauzeerd(admin, sessie.route_id)) return NextResponse.json({ fout: PAUZE_FOUT, pauze: true }, { status: 409 });
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

  // Controleer of punt bij de route hoort
  const { data: punt } = await admin
    .from("route_points")
    .select("id, type")
    .eq("id", routePointId)
    .eq("route_id", sessie.route_id)
    .maybeSingle();

  if (!punt) return NextResponse.json({ fout: "Ongeldig punt" }, { status: 400 });

  // Alleen bij een echte foto-opdracht: anders kon een meerkeuzevraag met een foto worden "beantwoord"
  const { data: vraag, error: vraagFout } = await admin.from("questions").select("type, points").eq("route_point_id", routePointId).maybeSingle();
  if (vraagFout) return NextResponse.json({ fout: "De vraag kon niet worden geladen, probeer het opnieuw" }, { status: 503 });
  if (vraag?.type !== "foto_opdracht") return NextResponse.json({ fout: "Bij dit punt hoort geen foto-opdracht" }, { status: 400 });

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

  // Het team speelt meteen door: het punt wordt afgerond, de punten komen erbij zodra de beheerder de foto
  // heeft goedgekeurd (vóór de uitslag wordt vrijgegeven). Eerst het punt claimen (alleen als het nog open
  // staat), dan pas uploaden; mislukt het uploaden, dan gaat het punt weer open en kan het team het opnieuw
  // proberen.
  const rondAf = () => admin
    .from("player_point_progress")
    .update({ answered_at: new Date().toISOString(), is_correct: null, points_awarded: 0 })
    .eq("id", voortgangRij.id)
    .is("answered_at", null)
    .select()
    .maybeSingle();
  const zetOpen = () => admin.from("player_point_progress").update({ answered_at: null, points_awarded: null }).eq("id", voortgangRij.id)
    .then(() => undefined, () => undefined);

  // Er is al een foto (een eerdere poging bleef halverwege steken): alleen het punt nog afronden
  if (bestaandeInzending) {
    const { data: voortgang } = await rondAf();
    if (!voortgang) return NextResponse.json({ fout: "Al een foto ingediend" }, { status: 409 });
    return NextResponse.json({ foto_id: bestaandeInzending.id, voortgang });
  }

  const { data: voortgang, error: claimFout } = await rondAf();
  if (claimFout) return NextResponse.json({ fout: "Opslaan lukte niet, probeer het opnieuw" }, { status: 500 });
  if (!voortgang) return NextResponse.json({ fout: "Dit punt is al afgerond" }, { status: 409 });

  // Upload naar Storage
  const ext = bestand.type === "image/png" ? "png" : bestand.type === "image/webp" ? "webp" : "jpg";
  const pad = `${sessie.id}/${routePointId}.${ext}`;
  const buffer = Buffer.from(await bestand.arrayBuffer());

  const { error: uploadFout } = await admin.storage
    .from("foto-inzendingen")
    .upload(pad, buffer, { contentType: bestand.type, upsert: true });

  if (uploadFout) {
    await zetOpen();
    return NextResponse.json({ fout: "Foto uploaden lukte niet, probeer het opnieuw" }, { status: 500 });
  }

  // 🤳 Selfie bij de finish (eindpunt, 0 punten): geen opdracht om te beoordelen, dus meteen goedgekeurd en
  // meteen de teamfoto. Een finishopdracht met punten wacht wel op de keuring.
  const meteenGoed = punt.type === "eindpunt" && (vraag.points ?? 0) === 0;

  // Foto-inzending aanmaken
  const { data: inzending, error: inzendingFout } = await admin
    .from("foto_inzendingen")
    .insert({
      session_id: sessie.id,
      route_point_id: routePointId,
      foto_pad: pad,
      status: meteenGoed ? "goedgekeurd" : "wacht",
      punten_toegekend: 0,
      ...(meteenGoed ? { beoordeeld_op: new Date().toISOString() } : {}),
    })
    .select()
    .single();

  if (inzendingFout) {
    await zetOpen();
    await admin.storage.from("foto-inzendingen").remove([pad]).catch(() => undefined);
    return NextResponse.json({ fout: "Foto opslaan lukte niet, probeer het opnieuw" }, { status: 500 });
  }

  // Sessie bijwerken
  await admin.from("player_sessions").update({ current_point_id: routePointId }).eq("id", sessie.id);
  if (meteenGoed) await admin.from("player_point_progress").update({ is_correct: true }).eq("id", voortgangRij.id);

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

  // Pushmelding naar de beheerder: er is een foto om te keuren (niet bij een selfie die al goed is)
  if (meteenGoed) return NextResponse.json({ foto_id: inzending.id, voortgang, goedgekeurd: true });
  const { data: team } = await admin.from("players").select("nickname, login_name").eq("id", ctx.spelerId).maybeSingle();
  await stuurPushNaarBeheer({
    titel: `📸 Nieuwe foto van ${team?.nickname ?? team?.login_name ?? "een team"}`,
    tekst: "Tik om de foto te bekijken en goed of af te keuren.",
    url: "/admin?keuren=1",
    tag: "foto",
  });

  return NextResponse.json({ foto_id: inzending.id, voortgang });
}
