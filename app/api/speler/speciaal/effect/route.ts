import { NextRequest, NextResponse } from "next/server";
import { spelGepauzeerd, PAUZE_FOUT, rondAfAlsTijdVoorbij, eindtijdVoorbij } from "@/lib/eindtijd";
import { logItem } from "@/lib/item-log";
import { haalItemSessie, doelwitNaFinishVan } from "@/lib/item-sessie";
import { haalSpeler } from "@/lib/speler-sessie";
import { telBijScore, wisselScores, boekScoreOver, ruilPunten } from "@/lib/score";

const TYPES_MET_DOEL = new Set(["spook", "bom", "wissel", "dief", "banaan"]);

function formatteerDuur(seconden: number): string {
  const min = Math.floor(seconden / 60);
  const sec = seconden % 60;
  if (min === 0) return `${sec} seconden`;
  if (sec === 0) return min === 1 ? "1 minuut" : `${min} minuten`;
  return `${min}:${String(sec).padStart(2, "0")} minuten`;
}

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

  const routeSterWaarde = routeWaarden?.ster_waarde ?? item.points_effect ?? 50;
  const routeBomWaarde = routeWaarden?.bom_waarde ?? item.points_effect ?? 30;

  // ── Item eerst atomair claimen ────────────────────────────────────────────
  // Alleen het verzoek dat used_at zelf van leeg naar gevuld zet, mag het item uitvoeren. Twee keer tikken
  // (of twee telefoons) laat het item dus maar één keer werken. Mislukt daarna iets, dan komt het item terug.
  const usedAt = new Date().toISOString();
  const { data: geclaimd, error: claimFout } = await admin.from("special_items").update({ used_at: usedAt })
    .eq("id", item.id).eq("claimed_by_session_id", eigenSessie.id).is("used_at", null).select("id");
  if (claimFout) return NextResponse.json({ fout: "Item inzetten lukte niet, probeer het opnieuw" }, { status: 500 });
  if (!geclaimd?.length) return NextResponse.json({ fout: "Dit item is net al gebruikt" }, { status: 409 });

  // Een effect vastleggen. Upsert: na een respawn wordt hetzelfde item opnieuw gebruikt, en de oude regel van
  // de vorige ronde (zelfde item, zelfde doel) zou anders op de unieke regel botsen.
  type Effect = { target_session_id: string; effect_type: string; expires_at: string | null; notification: string | null };
  const zetEffect = async (e: Effect) => {
    const { error } = await admin.from("special_item_effects")
      .upsert({ special_item_id: item.id, applied_at: new Date().toISOString(), ...e }, { onConflict: "special_item_id,target_session_id" });
    if (error) throw new Error(error.message);
  };
  const haalEffectWeg = (doel: string) =>
    admin.from("special_item_effects").delete().eq("special_item_id", item.id).eq("target_session_id", doel).then(() => undefined, () => undefined);

  let eigenNotificatie: string | null = null;
  try {
    if (item.type === "ster") {
      await telBijScore(admin, eigenSessie.id, routeSterWaarde);

    } else if (item.type === "verdubbeling") {
      await zetEffect({ target_session_id: eigenSessie.id, effect_type: "verdubbeling", expires_at: null, notification: null });

    } else if (item.type === "radar") {
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
      await zetEffect({ target_session_id: eigenSessie.id, effect_type: "radar", expires_at: expiresAt, notification: null });

    } else if (item.type === "spook") {
      const duurSeconden = routeWaarden?.spook_duur_seconden ?? 600;
      const expiresAt = new Date(Date.now() + duurSeconden * 1000).toISOString();
      await zetEffect({
        target_session_id: doelSessie!.id, effect_type: "ghost", expires_at: expiresAt,
        notification: `👻 Spook aangeboden door team ${aanvallerNaam}! Je volgende punt is ${formatteerDuur(duurSeconden)} verborgen.`,
      });

    } else if (item.type === "bom") {
      const aftrek = routeBomWaarde;
      // Eerst de melding, dan de punten: mislukt de aftrek, dan gaat de melding weer weg
      await zetEffect({ target_session_id: doelSessie!.id, effect_type: "punt_aftrek", expires_at: null, notification: `💣 Bom van team ${aanvallerNaam}! Je verliest ${aftrek} punten.` });
      // Ook als het team daardoor in de min komt
      try { await telBijScore(admin, doelSessie!.id, -aftrek); } catch (e) { await haalEffectWeg(doelSessie!.id); throw e; }

    } else if (item.type === "wissel") {
      await wisselScores(admin, eigenSessie.id, doelSessie!.id);
      // De scores zijn gewisseld; lukt alleen de melding niet, dan is het item toch gebruikt
      await zetEffect({ target_session_id: doelSessie!.id, effect_type: "wissel", expires_at: null, notification: `🔄 Team ${aanvallerNaam} wisselt scores met jou!` })
        .catch(() => undefined);
      eigenNotificatie = `🔄 Je score is gewisseld met team ${doelNaam}!`;

    } else if (item.type === "dief") {
      // De dief steelt meteen de punten van een goede vraag: de punten van de laatste vraag die het
      // doelteam goed had (geen infopunt zonder vraag), of (nog geen goede vraag) het gemiddelde van een vraag
      // in deze route. Nooit meer dan het doelteam heeft: een score gaat niet onder 0.
      const { data: laatsteGoed } = await admin
        .from("player_point_progress")
        .select("points_awarded, route_points!inner(questions!inner(id))")
        .eq("session_id", doelSessie!.id)
        .eq("is_correct", true)
        .gt("points_awarded", 0)
        .order("answered_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let buit = laatsteGoed?.points_awarded ?? 0;
      if (!buit) {
        const { data: vragen } = await admin
          .from("questions")
          .select("points, route_points!inner(route_id)")
          .eq("route_points.route_id", eigenSessie.route_id)
          .gt("points", 0);
        const lijst = (vragen ?? []).map((v) => v.points as number);
        buit = lijst.length ? Math.round(lijst.reduce((a, b) => a + b, 0) / lijst.length) : routeBomWaarde;
      }
      const gestolen = await boekScoreOver(admin, doelSessie!.id, eigenSessie.id, buit);
      await zetEffect({
        target_session_id: doelSessie!.id, effect_type: "punt_aftrek", expires_at: null,
        notification: gestolen
          ? `🦹 Dief van team ${aanvallerNaam}! Ze hebben ${gestolen} punten van jullie gestolen.`
          : `🦹 Dief van team ${aanvallerNaam}! Gelukkig hadden jullie nog geen punten om te stelen.`,
      }).catch(() => undefined);
      eigenNotificatie = gestolen
        ? `🦹 Je dief heeft ${gestolen} punten gestolen van team ${doelNaam}!`
        : `🦹 Team ${doelNaam} had nog geen punten: je dief kwam met lege handen terug.`;

    } else if (item.type === "banaan") {
      // Haal session_point_order op voor doelteam
      const { data: spo } = await admin
        .from("session_point_order")
        .select("volgorde, route_point_id")
        .eq("session_id", doelSessie!.id)
        .order("volgorde");

      // Welke punten heeft het doelteam al bereikt? (ook als ze er nu staan met de vraag open)
      const { data: doelBereikt } = await admin
        .from("player_point_progress")
        .select("route_point_id")
        .eq("session_id", doelSessie!.id);

      // Het eindpunt (laatste) blijft altijd als laatste, en bij Verspreid blijft het startpunt (eerste) staan
      const bereiktIds = new Set((doelBereikt ?? []).map((v: { route_point_id: string }) => v.route_point_id));
      const laatsteVolgorde = Math.max(0, ...(spo ?? []).map((s) => s.volgorde));
      const isVerspreid = routeWaarden?.modus === "verspreid" && (spo ?? []).length >= 3;
      const onbezochtSpo = (spo ?? []).filter(
        (s) => !bereiktIds.has(s.route_point_id) && s.volgorde !== laatsteVolgorde && !(isVerspreid && s.volgorde === 1),
      );

      if (onbezochtSpo.length < 2) {
        await admin.from("special_items").update({ used_at: null }).eq("id", item.id);
        // "Punten" las als score; het gaat om de plekken op de kaart die dit team nog moet lopen
        return NextResponse.json({ fout: "Bij dit team kan de banaan niets meer omwisselen: ze zijn bijna klaar. Kies een ander team, je houdt de banaan." }, { status: 400 });
      }

      // Het volgende punt ruilt van plek met het punt daarna: 1-2-3 wordt 2-1-3.
      // Het team moet dus eerst naar het volgende punt, daarna terug naar het oude, en dan verder.
      const eerste = onbezochtSpo[0];
      const ander = onbezochtSpo[1];
      await ruilPunten(admin, doelSessie!.id, eerste.volgorde, ander.volgorde);
      try {
        await zetEffect({
          target_session_id: doelSessie!.id, effect_type: "banaan", expires_at: null,
          notification: `🍌 Banaan van team ${aanvallerNaam}! Je volgende punt is omgewisseld met het punt daarna: je loopt eerst naar dat punt en daarna pas terug.`,
        });
      } catch (e) {
        // Zonder melding weet het team niet dat de volgorde is veranderd: dan terugruilen
        await ruilPunten(admin, doelSessie!.id, eerste.volgorde, ander.volgorde).catch(() => undefined);
        throw e;
      }

    } else if (item.type === "vraagteken") {
      const roll = Math.random();
      const sterWaarde = routeSterWaarde;

      if (roll < 0.40) {
        // 40%: dubbele ster voor jezelf
        await telBijScore(admin, eigenSessie.id, sterWaarde * 2);
        eigenNotificatie = `❓ Vraagteken! Je krijgt 2× ster (${sterWaarde * 2} punten)! 🎉`;

      } else if (roll < 0.60) {
        // 20%: ieder ander actief team willekeurig ster of bom
        const { data: andereSessies } = await admin
          .from("player_sessions")
          .select("id")
          .eq("route_id", eigenSessie.route_id)
          .eq("status", "actief")
          .neq("id", eigenSessie.id);

        for (const s of andereSessies ?? []) {
          const teamRol = Math.random() < 0.5;
          const delta = teamRol ? sterWaarde : -Math.abs(sterWaarde);
          await zetEffect({
            target_session_id: s.id, effect_type: "punt_aftrek", expires_at: null,
            notification: teamRol
              ? `❓ Vraagteken van ${aanvallerNaam}: jij krijgt ${sterWaarde} bonuspunten! ⭐`
              : `❓ Vraagteken van ${aanvallerNaam}: je verliest ${Math.abs(sterWaarde)} punten! 💣`,
          });
          try { await telBijScore(admin, s.id, delta); } catch (e) { await haalEffectWeg(s.id); throw e; }
        }
        eigenNotificatie = `❓ Vraagteken! Ieder ander team krijgt een willekeurig effect van jou!`;

      } else if (roll < 0.70) {
        // 10%: jackpot
        await telBijScore(admin, eigenSessie.id, sterWaarde * 5);
        eigenNotificatie = `❓ JACKPOT! Je krijgt 5× ster (${sterWaarde * 5} punten)! 🎰🎉`;

      } else if (roll < 0.80) {
        // 10%: verlies 200 punten
        await telBijScore(admin, eigenSessie.id, -200);
        eigenNotificatie = `❓ Pech! Je verliest 200 punten. 💸`;

      } else {
        // 20%: bom op jezelf (verlies sterwaarde punten)
        await telBijScore(admin, eigenSessie.id, -Math.abs(sterWaarde));
        eigenNotificatie = `❓ Bom op jezelf! Je verliest ${Math.abs(sterWaarde)} punten. 💥`;
      }

    } else {
      await admin.from("special_items").update({ used_at: null }).eq("id", item.id);
      return NextResponse.json({ fout: "Onbekend item type" }, { status: 400 });
    }
  } catch (e) {
    // Mislukt: het item komt terug, zodat het team het opnieuw kan proberen
    await admin.from("special_items").update({ used_at: null }).eq("id", item.id).then(() => undefined, () => undefined);
    console.error("Item inzetten mislukt", item.type, e);
    return NextResponse.json({ fout: "Item inzetten lukte niet, probeer het opnieuw" }, { status: 500 });
  }

  await logItem(admin, { gebruiker: eigenSessie.id, doel: doelSessie?.id ?? null, type: item.type, omschrijving: eigenNotificatie ?? null, plek });

  return NextResponse.json({ ok: true, eigen_notificatie: eigenNotificatie });
}
