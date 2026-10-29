import { NextRequest, NextResponse } from "next/server";
import { laatItemsVervallen } from "@/lib/items-vervallen";
import { itemsNaFinishVan } from "@/lib/item-sessie";
import { normaliserenNumeriek, tekstKlopt } from "@/lib/geo";
import { stemWinnaars } from "@/lib/stemmen";
import { rondAfAlsTijdVoorbij, eindtijdVoorbij, PAUZE_FOUT } from "@/lib/eindtijd";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { telBijScore } from "@/lib/score";
import { goudenNu } from "@/lib/spelplezier";
import { naAntwoord } from "@/lib/spelplezier-server";

export async function POST(request: NextRequest) {
  const ctx = await haalSpelerSessie();
  if (!ctx?.sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });
  const admin = ctx.admin, sessie = ctx.sessie;
  // Na de eindtijd telt niets meer mee
  const tijd = await rondAfAlsTijdVoorbij(admin, sessie.route_id);
  if (eindtijdVoorbij(tijd)) {
    return NextResponse.json({ fout: "Het spel is afgelopen: de eindtijd is voorbij" }, { status: 403 });
  }
  if (tijd.pauze) return NextResponse.json({ fout: PAUZE_FOUT, pauze: true }, { status: 409 });

  const body = await request.json();
  const { route_point_id, selected_answer_id, open_answer_text } = body;
  // De tijdslimiet van de vraag is verstreken: de vraag telt als fout
  const teLaat = body.te_laat === true;
  if (!route_point_id) return NextResponse.json({ fout: "route_point_id ontbreekt" }, { status: 400 });
  // Uit de wachtrij van een eerder spel (na uitloggen of een nieuw spel): niet bij dit spel optellen
  if (body.sessie_id && body.sessie_id !== sessie.id) return NextResponse.json({ fout: "Dit hoort bij een eerder spel" }, { status: 409 });

  const { data: punt } = await admin
    .from("route_points")
    .select("id, points, type")
    .eq("id", route_point_id)
    .eq("route_id", sessie.route_id)
    .maybeSingle();

  if (!punt) return NextResponse.json({ fout: "Ongeldig punt" }, { status: 400 });
  // "*": de 🎉 spelplezier-instellingen (migratie 007) mogen ontbreken
  const { data: route } = await admin.from("routes").select("*").eq("id", sessie.route_id).maybeSingle();

  const { data: bestaand } = await admin
    .from("player_point_progress")
    .select("id, answered_at, reached_at")
    .eq("session_id", sessie.id)
    .eq("route_point_id", route_point_id)
    .maybeSingle();

  if (!bestaand) return NextResponse.json({ fout: "Punt nog niet bereikt" }, { status: 400 });
  if (bestaand.answered_at) return NextResponse.json({ fout: "Punt al verwerkt" }, { status: 409 });

  // ── Antwoord controleren ──────────────────────────────────────────────────
  let isCorrect: boolean | null = null;
  let puntWaarde = 0;

  // Feedback-info die teruggestuurd wordt voor de UI
  let correctAnswerId: string | null = null;
  let correctAnswerIds: string[] = [];
  const uitleg: Record<string, string> = {};
  let correctTextAnswers: string[] | null = null;
  let numericAnswer: number | null = null;
  let numericTolerance: number | null = null;
  // 🗳️ Stemvraag: de punten komen pas als de stemming sluit
  let isStem = false;
  let lateStem = false;
  // Hing er een vraag aan het punt? (verdubbeling geldt alleen voor een beantwoorde vraag)
  let metVraag = false;

  // Hangt er een vraag aan het punt (ook aan een informatiepunt, zoals het startpunt), dan
  // moet die beantwoord worden: zonder antwoord wordt het punt niet verwerkt.
  // Ook de finish kan een vraag of opdracht hebben; zonder vraag telt alleen de puntwaarde.
  {
    // Vraag ophalen (een doorlooppunt stelt nooit een vraag, ook als er nog een aan hangt)
    const { data: vraag, error: vraagFout } = punt.type === "doorlooppunt" ? { data: null, error: null } : await admin
      .from("questions")
      .select("*, answer_options(*)")
      .eq("route_point_id", route_point_id)
      .order("order_index", { referencedTable: "answer_options" })
      .maybeSingle();
    // Een leesfout (of per ongeluk twee vragen aan één punt) is niet hetzelfde als "geen vraag": dan niets
    // afronden en geen punten geven, maar het team het opnieuw laten proberen
    if (vraagFout) return NextResponse.json({ fout: "De vraag kon niet worden geladen, probeer het opnieuw" }, { status: 503 });
    metVraag = !!vraag;

    if (!vraag) {
      // Vraagpunt zonder vraag → doorgaan als informatiepunt; een doorlooppunt levert niets op
      isCorrect = true;
      puntWaarde = punt.type === "doorlooppunt" ? 0 : punt.points;
    } else if (teLaat && vraag.type !== "foto_opdracht") {
      isCorrect = false;
      puntWaarde = 0;
      // Toch laten zien wat het goede antwoord was (niet bij een stemvraag: daar is er geen)
      if (vraag.type !== "stemvraag") {
        correctAnswerIds = (vraag.answer_options ?? []).filter((a: { is_correct: boolean }) => a.is_correct).map((a: { id: string }) => a.id);
        correctAnswerId = correctAnswerIds[0] ?? null;
        if (vraag.type === "open") {
          if (vraag.numeric_answer !== null) { numericAnswer = vraag.numeric_answer; numericTolerance = vraag.numeric_tolerance ?? 0; }
          else correctTextAnswers = vraag.correct_text_answers ?? [];
        }
      }
    } else if (vraag.type === "meerkeuze_tekst" || vraag.type === "meerkeuze_afbeelding") {
      if (!selected_answer_id) return NextResponse.json({ fout: "Geen antwoord opgegeven" }, { status: 400 });

      const gekozen = vraag.answer_options.find((a: { id: string }) => a.id === selected_answer_id);
      if (!gekozen) return NextResponse.json({ fout: "Ongeldig antwoord" }, { status: 400 });

      isCorrect = gekozen.is_correct;
      // Eigen punten per antwoord (kan negatief zijn); anders goed = vraagpunten, fout = 0
      puntWaarde = typeof gekozen.punten === "number" ? gekozen.punten : (isCorrect ? vraag.points : 0);
      // Er kunnen meerdere antwoorden goed zijn: allemaal meesturen (de eerste blijft voor oudere apps)
      correctAnswerIds = vraag.answer_options.filter((a: { is_correct: boolean }) => a.is_correct).map((a: { id: string }) => a.id);
      correctAnswerId = correctAnswerIds[0] ?? null;
      // 💬 Uitleg per antwoord (migratie 023), voor de antwoorden die de speler daarna ziet: het gekozen en de goede
      for (const o of vraag.answer_options as { id: string; uitleg?: string | null }[]) {
        if (o.uitleg && (o.id === selected_answer_id || correctAnswerIds.includes(o.id))) uitleg[o.id] = o.uitleg;
      }
    } else if (vraag.type === "stemvraag") {
      if (!selected_answer_id) return NextResponse.json({ fout: "Geen keuze opgegeven" }, { status: 400 });
      if (!vraag.answer_options.some((a: { id: string }) => a.id === selected_answer_id)) return NextResponse.json({ fout: "Ongeldige keuze" }, { status: 400 });
      isStem = true;
      if (vraag.stem_gesloten) {
        // Stemming al dicht: meteen vergelijken met de uitslag van de stemming. Deze late stem verandert de
        // uitslag niet meer: de keuze wordt niet als stem bewaard (anders kon een late stem de winnaar
        // omgooien terwijl de punten al waren uitgedeeld)
        const { winnaars } = await stemWinnaars(admin, route_point_id);
        isCorrect = winnaars.includes(selected_answer_id);
        puntWaarde = isCorrect ? vraag.points : 0;
        lateStem = true;
      } else {
        isCorrect = null;
        puntWaarde = 0;
      }
    } else if (vraag.type === "open") {
      if (typeof open_answer_text !== "string" || !open_answer_text.trim()) {
        return NextResponse.json({ fout: "Vul eerst een antwoord in" }, { status: 400 });
      }

      if (vraag.numeric_answer !== null) {
        // Numeriek
        const ingevoerd = normaliserenNumeriek(open_answer_text);
        const tolerantie = vraag.numeric_tolerance ?? 0;
        isCorrect = ingevoerd !== null && Math.abs(ingevoerd - vraag.numeric_answer) <= tolerantie;
        numericAnswer = vraag.numeric_answer;
        numericTolerance = tolerantie;
      } else {
        // Tekst
        isCorrect = (vraag.correct_text_answers ?? []).some((goed: string) => tekstKlopt(open_answer_text, goed));
        correctTextAnswers = vraag.correct_text_answers ?? [];
      }
      puntWaarde = isCorrect ? vraag.points : 0;
    } else if (vraag.type === "foto_opdracht") {
      // Een foto-opdracht wordt verwerkt via het insturen van de foto (/api/speler/foto)
      return NextResponse.json({ fout: "Stuur eerst een foto in" }, { status: 400 });
    }
  }

  // ── Punt claimen ──────────────────────────────────────────────────────────
  // Alleen het verzoek dat answered_at zelf van leeg naar gevuld zet, verwerkt het antwoord. Twee verzoeken
  // tegelijk (dubbel tikken, de vraagtimer en een antwoord, de wachtrij) geven zo nooit twee keer punten.
  const antwoordVelden = {
    selected_answer_id: lateStem ? null : selected_answer_id ?? null,
    open_answer_text: open_answer_text ?? null,
    is_correct: isCorrect,
  };
  const { data: geclaimd, error: claimFout } = await admin
    .from("player_point_progress")
    .update({ answered_at: new Date().toISOString(), ...antwoordVelden, points_awarded: puntWaarde })
    .eq("id", bestaand.id)
    .is("answered_at", null)
    .select("id");
  if (claimFout) return NextResponse.json({ fout: "Antwoord opslaan lukte niet, probeer het opnieuw" }, { status: 500 });
  if (!geclaimd?.length) return NextResponse.json({ fout: "Punt al verwerkt" }, { status: 409 });
  // Mislukt hierna iets, dan het punt weer openzetten: het team kan dan veilig opnieuw indienen
  const zetTerug = () => admin.from("player_point_progress")
    .update({ answered_at: null, selected_answer_id: null, open_answer_text: null, is_correct: null, points_awarded: null })
    .eq("id", bestaand.id).then(() => undefined, () => undefined);

  // Verdubbeling en dief werken alleen op een positieve score. Bij 0 of minpunten blijven
  // ze gewoon klaarstaan voor de volgende vraag waarmee wél punten worden verdiend.
  // Spelregel (28-10-2026): verdubbeling alleen bij een gewone vraag. Een infopunt zonder vraag gebruikt hem
  // niet op, en foto's en stemvragen (punten komen later) tellen niet dubbel.
  if (puntWaarde > 0 && metVraag && !isStem) {
    const { data: dubbel } = await admin
      .from("special_item_effects")
      .select("id")
      .eq("target_session_id", sessie.id)
      .eq("effect_type", "verdubbeling")
      .order("applied_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dubbel) {
      // Alleen verdubbelen als dít verzoek het effect echt heeft verbruikt
      const { data: weg } = await admin.from("special_item_effects").delete().eq("id", dubbel.id).select("id");
      if (weg?.length) puntWaarde *= 2;
    }
  }

  // ⏰ Gouden kwartier van de spelleider: een goede gewone vraag telt dubbel (na een eventuele verdubbeling)
  const gouden = puntWaarde > 0 && metVraag && !isStem && goudenNu(route);
  if (gouden) puntWaarde *= 2;

  // Diefstal check: actief effect op eigen sessie? (alleen voor vraagpunten)
  // Alleen nog voor dieven die vóór de wijziging zijn ingezet: een nieuwe dief steelt meteen bij het inzetten.
  if (punt.type === "vraagpunt" && puntWaarde > 0) {
    const { data: diefstal } = await admin
      .from("special_item_effects")
      .select("id, special_item_id")
      .eq("target_session_id", sessie.id)
      .eq("effect_type", "diefstal")
      .order("applied_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (diefstal) {
      await admin.from("special_item_effects").delete().eq("id", diefstal.id);

      const { data: diefItem } = await admin
        .from("special_items")
        .select("claimed_by_session_id")
        .eq("id", diefstal.special_item_id)
        .maybeSingle();

      if (diefItem?.claimed_by_session_id) {
        const { data: diefSessie } = await admin
          .from("player_sessions")
          .select("score, player_id")
          .eq("id", diefItem.claimed_by_session_id)
          .maybeSingle();

        const { data: diefSpeler } = await admin
          .from("players")
          .select("nickname, login_name")
          .eq("id", diefSessie?.player_id ?? "")
          .maybeSingle();
        const diefNaam = diefSpeler?.nickname ?? diefSpeler?.login_name ?? "Een team";

        const { data: slachtofferSpeler } = await admin
          .from("players")
          .select("nickname, login_name")
          .eq("id", sessie.player_id)
          .maybeSingle();
        const slachtofferNaam = slachtofferSpeler?.nickname ?? slachtofferSpeler?.login_name ?? "een team";

        await telBijScore(admin, diefItem.claimed_by_session_id, puntWaarde).catch(() => undefined);

        // Meldingen als punt_aftrek (alleen melding): met type "diefstal" zou zo'n melding
        // bij de volgende vraag zelf weer als actieve dief worden gevonden
        await Promise.all([
          admin.from("special_item_effects").insert({
            special_item_id: diefstal.special_item_id,
            target_session_id: sessie.id,
            effect_type: "punt_aftrek",
            expires_at: null,
            notification: `🦹 ${diefNaam} heeft je ${puntWaarde} punten gestolen!`,
          }),
          admin.from("special_item_effects").insert({
            special_item_id: diefstal.special_item_id,
            target_session_id: diefItem.claimed_by_session_id,
            effect_type: "punt_aftrek",
            expires_at: null,
            notification: `🦹 Je hebt ${puntWaarde} punten gestolen van ${slachtofferNaam}!`,
          }),
        ]);

        puntWaarde = 0;
      }
    }
  }

  // ── Voortgang opslaan ─────────────────────────────────────────────────────
  // De definitieve punten (na verdubbeling of een oude dief) bij het al geclaimde punt
  const { data: bijgewerkt, error } = await admin
    .from("player_point_progress")
    .update({ points_awarded: puntWaarde })
    .eq("id", bestaand.id)
    .select()
    .single();

  if (error || !bijgewerkt) {
    await zetTerug();
    return NextResponse.json({ fout: "Antwoord opslaan lukte niet, probeer het opnieuw" }, { status: 500 });
  }

  // Score bijwerken, in één stap in de database (lib/score.ts).
  // Negatieve antwoordpunten trekken af, ook onder 0 (net als de bom)
  if (puntWaarde !== 0) {
    try {
      await telBijScore(admin, sessie.id, puntWaarde);
    } catch {
      await zetTerug();
      return NextResponse.json({ fout: "Punten bijschrijven lukte niet, probeer het opnieuw" }, { status: 500 });
    }
  }

  // 🔥 Reeks en 🎖️ badges: alleen bij een gewone vraag met een uitslag (geen stemvraag)
  const extra = metVraag && !isStem && isCorrect !== null
    ? await naAntwoord(admin, { sessie, route, goed: isCorrect, reachedAt: bestaand.reached_at, gouden }).catch(() => ({ reeks: null, reeks_item: null }))
    : { reeks: null, reeks_item: null };

  // Eindpunt → sessie sluiten
  if (punt.type === "eindpunt") {
    await admin
      .from("player_sessions")
      .update({ status: "voltooid", finished_at: new Date().toISOString() })
      .eq("id", sessie.id);
    await laatItemsVervallen(admin, [sessie.id], { naFinishTypes: itemsNaFinishVan(route) });
  }

  return NextResponse.json({
    voortgang: bijgewerkt,
    is_correct: isCorrect,
    points_awarded: puntWaarde,
    correct_answer_id: correctAnswerId,
    correct_answer_ids: correctAnswerIds,
    uitleg,
    correct_text_answers: correctTextAnswers,
    numeric_answer: numericAnswer,
    numeric_tolerance: numericTolerance,
    stem: isStem,
    gouden,
    reeks: extra.reeks,
    reeks_item: extra.reeks_item,
  });
}
