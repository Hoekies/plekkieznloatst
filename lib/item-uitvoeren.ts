import type { createAdminClient } from "@/lib/supabase-admin";
import { telBijScore, wisselScores, boekScoreOver, ruilPunten } from "@/lib/score";
import { plezierInstellingen } from "@/lib/spelplezier";

type AdminClient = ReturnType<typeof createAdminClient>;

export const TYPES_MET_DOEL = new Set(["spook", "bom", "wissel", "dief", "banaan"]);

function formatteerDuur(seconden: number): string {
  const min = Math.floor(seconden / 60);
  const sec = seconden % 60;
  if (min === 0) return `${sec} seconden`;
  if (sec === 0) return min === 1 ? "1 minuut" : `${min} minuten`;
  return `${min}:${String(sec).padStart(2, "0")} minuten`;
}

export type ItemUitkomst = { ok: true; eigenNotificatie: string | null } | { ok: false; fout: string; status: number };

// Het effect van een item uitvoeren: gedeeld door de spelersapp (api/speler/speciaal/effect) en de 🧪
// testtegenstander (lib/testteam.ts), zodat een test precies hetzelfde doet als een echt spel.
// Het item moet door eigenSessie geclaimd zijn en nog niet gebruikt; doelSessie is al gecontroleerd.
export async function voerItemUit(admin: AdminClient, p: {
  item: { id: string; type: string; points_effect: number | null };
  eigenSessie: { id: string; route_id: string };
  doelSessie: { id: string; score: number; player_id: string } | null;
  routeWaarden: Record<string, unknown> | null;
  aanvallerNaam: string;
  doelNaam: string;
}): Promise<ItemUitkomst> {
  const { item, eigenSessie, doelSessie, aanvallerNaam, doelNaam } = p;
  const routeWaarden = p.routeWaarden as {
    ster_waarde?: number | null; bom_waarde?: number | null; spook_duur_seconden?: number | null; modus?: string | null;
  } | null;
  const routeSterWaarde = routeWaarden?.ster_waarde ?? item.points_effect ?? 50;
  const routeBomWaarde = routeWaarden?.bom_waarde ?? item.points_effect ?? 30;

  // ── Item eerst atomair claimen ────────────────────────────────────────────
  // Alleen het verzoek dat used_at zelf van leeg naar gevuld zet, mag het item uitvoeren. Twee keer tikken
  // (of twee telefoons) laat het item dus maar één keer werken. Mislukt daarna iets, dan komt het item terug.
  const usedAt = new Date().toISOString();
  const { data: geclaimd, error: claimFout } = await admin.from("special_items").update({ used_at: usedAt })
    .eq("id", item.id).eq("claimed_by_session_id", eigenSessie.id).is("used_at", null).select("id");
  if (claimFout) return { ok: false, fout: "Item inzetten lukte niet, probeer het opnieuw", status: 500 };
  if (!geclaimd?.length) return { ok: false, fout: "Dit item is net al gebruikt", status: 409 };

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

    } else if (item.type === "schaduw") {
      // 🥷 Een paar minuten onzichtbaar voor radar en duels (migratie 009; duur uit de route-instellingen)
      const minuten = plezierInstellingen(p.routeWaarden).schaduw.minuten;
      await zetEffect({ target_session_id: eigenSessie.id, effect_type: "schaduw", expires_at: new Date(Date.now() + minuten * 60_000).toISOString(), notification: null });

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
        return { ok: false, fout: "Bij dit team kan de banaan niets meer omwisselen: ze zijn bijna klaar. Kies een ander team, je houdt de banaan.", status: 400 };
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
      return { ok: false, fout: "Onbekend item type", status: 400 };
    }
  } catch (e) {
    // Mislukt: het item komt terug, zodat het team het opnieuw kan proberen
    await admin.from("special_items").update({ used_at: null }).eq("id", item.id).then(() => undefined, () => undefined);
    console.error("Item inzetten mislukt", item.type, e);
    return { ok: false, fout: "Item inzetten lukte niet, probeer het opnieuw", status: 500 };
  }
  return { ok: true, eigenNotificatie };
}
