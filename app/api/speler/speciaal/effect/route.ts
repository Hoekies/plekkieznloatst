import { NextRequest, NextResponse } from "next/server";
import { spelGepauzeerd, PAUZE_FOUT, rondAfAlsTijdVoorbij, eindtijdVoorbij } from "@/lib/eindtijd";
import { logItem } from "@/lib/item-log";
import { naGeraakt } from "@/lib/spelplezier-server";
import { haalItemSessie, doelwitNaFinishVan } from "@/lib/item-sessie";
import { haalSpeler } from "@/lib/speler-sessie";
import { voerItemUit, TYPES_MET_DOEL } from "@/lib/item-uitvoeren";
import { zelfdeSoortSpel } from "@/lib/testteam";

export async function POST(request: NextRequest) {
  const ik = await haalSpeler();
  if (!ik) return NextResponse.json({ fout: "Speler niet gevonden" }, { status: 403 });
  const { admin, spelerId } = ik;

  // Lopend spel, of na de finish als de route "items na de finish" toestaat (tot de uitslag vrij is)
  const itemSessie = await haalItemSessie(admin, spelerId);
  if (!itemSessie) return NextResponse.json({ fout: "Je kunt nu geen items meer inzetten" }, { status: 403 });
  const eigenSessie = itemSessie.sessie;
  if (await spelGepauzeerd(admin, eigenSessie.route_id)) return NextResponse.json({ fout: PAUZE_FOUT, pauze: true }, { status: 409 });
  // Na de eindtijd werkt een item niet meer (ook als de sessie nog niet door een ander verzoek is afgesloten)
  if (!itemSessie.naFinish && eindtijdVoorbij(await rondAfAlsTijdVoorbij(admin, eigenSessie.route_id))) {
    return NextResponse.json({ fout: "Het spel is afgelopen: de eindtijd is voorbij" }, { status: 403 });
  }

  const body = await request.json();
  const { special_item_id, target_session_id } = body;
  const plek = typeof body.latitude === "number" && typeof body.longitude === "number"
    ? { lat: body.latitude, lng: body.longitude } : null;
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

  if (itemSessie.naFinish && !itemSessie.toegestaan.includes(item.type)) {
    return NextResponse.json({ fout: "Dit item mag na de finish niet meer worden ingezet" }, { status: 400 });
  }

  // Items met doelkeuze vereisen target_session_id
  if (TYPES_MET_DOEL.has(item.type)) {
    if (!target_session_id) return NextResponse.json({ fout: "target_session_id is verplicht voor dit item" }, { status: 400 });
    if (target_session_id === eigenSessie.id) return NextResponse.json({ fout: "Je kunt jezelf niet targeten" }, { status: 400 });
  }

  // Route-niveau waarden ophalen voor ster/bom/vraagteken/spook
  const { data: routeWaarden } = await admin
    .from("routes")
    .select("*") // "*": een ontbrekende kolom laat anders de hele query mislukken
    .eq("id", eigenSessie.route_id)
    .maybeSingle();

  // Doel: een team dat nog onderweg is, of een gefinisht team — dat laatste alleen met
  // de items die de beheerder voor na de finish heeft aangezet (tot de uitslag vrij is)
  let doelSessie: { id: string; score: number; player_id: string } | null = null;
  if (TYPES_MET_DOEL.has(item.type)) {
    const { data: ds } = await admin
      .from("player_sessions")
      .select("id, score, player_id, status")
      .eq("id", target_session_id)
      .eq("route_id", eigenSessie.route_id)
      .in("status", ["actief", "voltooid"])
      .maybeSingle();
    if (!ds) return NextResponse.json({ fout: "Deze tegenstander speelt niet meer mee" }, { status: 400 });
    // 🧪 Een testteam gooit alleen op de testtegenstander, en echte teams nooit op een testteam
    if (!(await zelfdeSoortSpel(admin, spelerId, ds.player_id))) return NextResponse.json({ fout: "Deze tegenstander speelt niet mee in jouw spel" }, { status: 400 });
    if (ds.status === "voltooid" && !doelwitNaFinishVan(routeWaarden).includes(item.type)) {
      return NextResponse.json({ fout: "Dit team is al gefinisht: dit item kun je niet meer op hen inzetten" }, { status: 400 });
    }
    doelSessie = ds;
  }

  // Teamnamen voor de meldingen: gekozen naam, anders de loginnaam
  const { data: namen } = await admin
    .from("players")
    .select("id, nickname, login_name")
    .in("id", [spelerId, doelSessie?.player_id].filter(Boolean) as string[]);
  const teamNaam = (id: string | undefined, standaard: string) => {
    const p = (namen ?? []).find((n) => n.id === id);
    return p?.nickname ?? p?.login_name ?? standaard;
  };
  const aanvallerNaam = teamNaam(spelerId, "Onbekend team");
  const doelNaam = teamNaam(doelSessie?.player_id, "de tegenstander");

  // Het effect zelf: gedeeld met de 🧪 testtegenstander (lib/item-uitvoeren.ts)
  const uitkomst = await voerItemUit(admin, { item, eigenSessie, doelSessie, routeWaarden, aanvallerNaam, doelNaam });
  if (!uitkomst.ok) return NextResponse.json({ fout: uitkomst.fout }, { status: uitkomst.status });
  const eigenNotificatie = uitkomst.eigenNotificatie;

  await logItem(admin, { gebruiker: eigenSessie.id, doel: doelSessie?.id ?? null, type: item.type, omschrijving: eigenNotificatie ?? null, plek });
  if (doelSessie) await naGeraakt(admin, doelSessie.id).catch(() => undefined);

  return NextResponse.json({ ok: true, eigen_notificatie: eigenNotificatie });
}
