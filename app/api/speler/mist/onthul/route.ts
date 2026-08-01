import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haversine, mistCellenBinnenStraal, MIST_CEL_OPPERVLAK_M2 } from "@/lib/geo";
import { bepaalPlaats, PLAATS_HERCHECK_M } from "@/lib/plaats";
import {
  PLAATS_TIERS, ALGEMENE_BADGES, STERRENJAGER_DREMPEL, VOLHOUDER_MINUTEN,
  cellenNaarHectare, badgeWeergave,
} from "@/lib/mist-badges";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Geen speler" }, { status: 403 });

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id, route_id, score, started_at, mist_plaats, mist_plaats_lat, mist_plaats_lng")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const { lat, lng } = await request.json();
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ fout: "Ongeldige coördinaten" }, { status: 400 });
  }

  const { data: route } = await admin
    .from("routes")
    .select("mist_m2_per_ster")
    .eq("id", sessie.route_id)
    .maybeSingle();
  if (!route) return NextResponse.json({ fout: "Route niet gevonden" }, { status: 400 });

  // ── Nieuwe cellen bepalen ──────────────────────────────────────────────────
  // We moeten exact weten wélke cellen nieuw zijn, want alleen die tellen mee voor
  // de voortgang per plaats. Daarom eerst de bestaande ophalen binnen het (kleine)
  // rechthoekje rond de kandidaten, en in JS het verschil nemen.
  const kandidaten = mistCellenBinnenStraal(lat, lng);
  if (kandidaten.length === 0) {
    return NextResponse.json({ fout: "Geen cellen binnen bereik" }, { status: 400 });
  }
  const xs = kandidaten.map((c) => c.x);
  const ys = kandidaten.map((c) => c.y);

  const { data: bestaand } = await admin
    .from("mist_voortgang")
    .select("cell_x, cell_y")
    .eq("session_id", sessie.id)
    .gte("cell_x", Math.min(...xs)).lte("cell_x", Math.max(...xs))
    .gte("cell_y", Math.min(...ys)).lte("cell_y", Math.max(...ys));

  const bestaandSet = new Set((bestaand ?? []).map((c) => `${c.cell_x},${c.cell_y}`));
  const nieuweCellen = kandidaten.filter((c) => !bestaandSet.has(`${c.x},${c.y}`));

  if (nieuweCellen.length > 0) {
    await admin
      .from("mist_voortgang")
      .upsert(
        nieuweCellen.map((c) => ({ session_id: sessie.id, cell_x: c.x, cell_y: c.y })),
        { onConflict: "session_id,cell_x,cell_y", ignoreDuplicates: true }
      );
  }

  const { count } = await admin
    .from("mist_voortgang")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessie.id);

  const totaalM2 = (count ?? 0) * MIST_CEL_OPPERVLAK_M2;
  const mistSterren = Math.floor(totaalM2 / route.mist_m2_per_ster);

  // Score = mist-sterren + eventuele bonuspunten van vraagpunten — altijd herberekenen uit beide
  // bronnen, zodat dit onthul-endpoint nooit bonuspunten overschrijft die elders zijn bijgeschreven.
  const { data: beantwoord } = await admin
    .from("player_point_progress")
    .select("points_awarded")
    .eq("session_id", sessie.id)
    .not("answered_at", "is", null);
  const vraagpuntPunten = (beantwoord ?? []).reduce((som, p) => som + (p.points_awarded ?? 0), 0);

  const nieuweScore = mistSterren + vraagpuntPunten;
  if (nieuweScore !== sessie.score) {
    await admin.from("player_sessions").update({ score: nieuweScore }).eq("id", sessie.id);
  }

  // ── Plaats bepalen ─────────────────────────────────────────────────────────
  // Alleen opzoeken als we nog geen plaats hebben, of als het team flink verplaatst is.
  let plaats = sessie.mist_plaats;
  const moetOpzoeken =
    !plaats ||
    sessie.mist_plaats_lat === null || sessie.mist_plaats_lng === null ||
    haversine(lat, lng, sessie.mist_plaats_lat, sessie.mist_plaats_lng) > PLAATS_HERCHECK_M;

  if (moetOpzoeken) {
    const gevonden = await bepaalPlaats(lat, lng, admin);
    if (gevonden) {
      plaats = gevonden;
      await admin.from("player_sessions")
        .update({ mist_plaats: gevonden, mist_plaats_lat: lat, mist_plaats_lng: lng })
        .eq("id", sessie.id);
    }
  }

  // ── Voortgang per plaats bijwerken ─────────────────────────────────────────
  let plaatsCellen = 0;
  if (plaats) {
    const { data: huidig } = await admin
      .from("mist_plaats_voortgang")
      .select("id, cellen")
      .eq("session_id", sessie.id)
      .eq("plaats", plaats)
      .maybeSingle();

    plaatsCellen = (huidig?.cellen ?? 0) + nieuweCellen.length;
    if (huidig) {
      if (nieuweCellen.length > 0) {
        await admin.from("mist_plaats_voortgang").update({ cellen: plaatsCellen }).eq("id", huidig.id);
      }
    } else {
      await admin.from("mist_plaats_voortgang")
        .insert({ session_id: sessie.id, plaats, cellen: plaatsCellen });
    }
  }

  // ── Badges evalueren ───────────────────────────────────────────────────────
  // plaats is een lege string bij algemene badges — zie 022_mist_badges.sql.
  const teKennen: { session_id: string; code: string; plaats: string }[] = [];

  if (plaats) {
    const plaatsHa = cellenNaarHectare(plaatsCellen);
    for (const tier of PLAATS_TIERS) {
      if (plaatsHa >= tier.ha) teKennen.push({ session_id: sessie.id, code: tier.code, plaats });
    }
  }

  const { count: aantalPlaatsen } = await admin
    .from("mist_plaats_voortgang")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessie.id);

  const minutenOnderweg = (Date.now() - new Date(sessie.started_at).getTime()) / 60000;
  const algemeenBehaald: Record<string, boolean> = {
    eerste_mist: (count ?? 0) > 0,
    grensganger: (aantalPlaatsen ?? 0) >= 2,
    sterrenjager: nieuweScore >= STERRENJAGER_DREMPEL,
    volhouder: minutenOnderweg >= VOLHOUDER_MINUTEN,
  };
  for (const badge of ALGEMENE_BADGES) {
    if (algemeenBehaald[badge.code]) teKennen.push({ session_id: sessie.id, code: badge.code, plaats: "" });
  }

  // ignoreDuplicates + select levert alleen de écht nieuw toegekende badges op.
  let nieuweBadges: { code: string; plaats: string; emoji: string; titel: string; uitleg: string }[] = [];
  if (teKennen.length > 0) {
    const { data: toegekend } = await admin
      .from("mist_badges")
      .upsert(teKennen, { onConflict: "session_id,code,plaats", ignoreDuplicates: true })
      .select("code, plaats");

    nieuweBadges = (toegekend ?? []).flatMap((b) => {
      const weergave = badgeWeergave(b.code, b.plaats);
      return weergave ? [{ code: b.code, plaats: b.plaats, ...weergave }] : [];
    });
  }

  return NextResponse.json({
    totaalM2,
    score: nieuweScore,
    plaats,
    plaatsHa: cellenNaarHectare(plaatsCellen),
    nieuweBadges,
  });
}
