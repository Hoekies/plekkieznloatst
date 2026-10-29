import { NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { bonusVelden } from "@/lib/bonus";
import { createAdminClient } from "@/lib/supabase-admin";

// Route importeren uit een exportbestand. Versie 2 bevat ook het speltype, alle instellingen en de
// items op de kaart; versie 1 (oudere exports) alleen punten en vragen. De afbeeldingen zet de
// browser vooraf terug via /api/admin/routes/import/afbeelding.

type AntwoordOptieImport = {
  order_index: number; color: string; answer_type: string; text: string | null;
  image_path: string | null; is_correct: boolean; punten?: number | null; uitleg?: string | null;
};
type VraagImport = {
  type: string; question_text: string; question_image_path: string | null; points: number;
  correct_text_answers: string[] | null; numeric_answer: number | null; numeric_tolerance: number | null;
  antwoord_opties: AntwoordOptieImport[];
  antwoorden_husselen?: boolean; geluid_pad?: string | null; tijdslimiet_seconden?: number | null;
};
type PuntImport = {
  order_index: number; type: string; name: string; description: string | null; latitude: number; longitude: number;
  radius_meters: number; points: number; image_path: string | null; sound_path: string | null;
  qr_unlock_enabled?: boolean; vraag: VraagImport | null;
};
type ItemImport = { type: string; name: string; latitude: number; longitude: number; radius_meters: number; points_effect: number };
type RouteExport = {
  _version: number;
  route: { name: string; status: string; instellingen?: Record<string, unknown>; instappunten_volgorde?: Record<string, number> };
  route_punten: PuntImport[];
  items?: ItemImport[];
  bonusvragen?: Record<string, unknown>[];
};

// Alleen bekende instellingen overnemen
const INSTELLINGEN = [
  "modus", "verwacht_aantal_teams", "doel_afstand_km", "omgekeerde_teams", "ster_waarde", "bom_waarde",
  "item_respawn", "respawn_minuten", "plekzooi_duur_seconden", "spook_duur_seconden", "startitems",
  "items_na_finish", "items_na_finish_types", "tussenstand_interval_minuten", "tussenstand_duur_seconden",
];
// Nieuwere instellingen (migratie 012 en 014): los bijgewerkt, zodat importeren ook zonder die migraties lukt
// (puzzel_verdeling niet: die verwijst naar de punten van de oude route)
const EXTRA_INSTELLINGEN = ["alle_punten_zichtbaar", "puzzelwoord", "puzzel_bonus", "puzzel_omschrijving", "verboden_gebieden", "puzzel_aan", "puzzel_letter_punten", "puzzel_raad_bonus", "puzzel_volgorde",
  "huisstijl_kleur", "huisstijl_logo_pad", "welkom_foto_pad", "geluid_set",
  // ⚔️ Duel (migratie 006) en 🎉 spelplezier (migratie 007)
  "duel_aan", "duel_punten", "val_aan", "reeks_aan", "badges_aan", "fotobattle_aan", "schat_aan", "rad_aan", "spelplezier"];
const ITEM_TYPES = ["spook", "bom", "ster", "verdubbeling", "wissel", "dief", "radar", "banaan", "plekzooi", "vraagteken"];

export async function POST(request: Request) {
  const user = await haalGebruiker();
  if (!isAdmin(user)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  let body: RouteExport;
  try { body = await request.json(); } catch { return NextResponse.json({ fout: "Ongeldig JSON-bestand" }, { status: 400 }); }
  // 💬 Uitleg per antwoord alleen meenemen als migratie 023 gedraaid is (anders mislukt het invoegen)
  const uitlegKan = !(await createAdminClient().from("answer_options").select("uitleg").limit(1)).error;

  if (![1, 2].includes(body._version) || typeof body.route?.name !== "string" || !Array.isArray(body.route_punten)) {
    return NextResponse.json({ fout: "Ongeldig export-bestand (verkeerde versie of structuur)" }, { status: 400 });
  }

  const veiligPad = /^[\w\-\/]+\.(jpg|jpeg|png|webp|mp3|m4a|aac|wav|ogg|webm)$/i;
  const geldigePlek = (lat: unknown, lng: unknown) => {
    const a = Number(lat), b = Number(lng);
    return !isNaN(a) && a >= -90 && a <= 90 && !isNaN(b) && b >= -180 && b <= 180;
  };
  for (const punt of body.route_punten) {
    if (!geldigePlek(punt.latitude, punt.longitude)) return NextResponse.json({ fout: `Ongeldig coördinaat bij punt: ${punt.name}` }, { status: 400 });
    for (const pad of [punt.image_path, punt.vraag?.question_image_path, punt.vraag?.geluid_pad, ...(punt.vraag?.antwoord_opties ?? []).map((o) => o.image_path)]) {
      if (pad && !veiligPad.test(pad)) return NextResponse.json({ fout: `Ongeldig afbeeldingspad bij punt: ${punt.name}` }, { status: 400 });
    }
  }

  const admin = createAdminClient();

  // Route aanmaken — altijd als concept, nooit actief
  const instellingen = Object.fromEntries(Object.entries(body.route.instellingen ?? {}).filter(([k]) => INSTELLINGEN.includes(k)));
  if (instellingen.modus !== undefined && !["sequentieel", "verspreid"].includes(instellingen.modus as string)) delete instellingen.modus;
  const { data: nieuweRoute, error: routeError } = await admin
    .from("routes")
    .insert({ ...instellingen, name: body.route.name, status: "concept", is_active: false })
    .select("id")
    .single();
  if (routeError || !nieuweRoute) return NextResponse.json({ fout: `Kon route niet aanmaken: ${routeError?.message ?? ""}` }, { status: 500 });
  const extra = Object.fromEntries(Object.entries(body.route.instellingen ?? {}).filter(([k]) => EXTRA_INSTELLINGEN.includes(k)));
  if (Object.keys(extra).length) await admin.from("routes").update(extra).eq("id", nieuweRoute.id);

  const nieuwPuntVoorVolgorde = new Map<number, string>();
  for (const punt of body.route_punten) {
    const { data: nieuwPunt, error: puntError } = await admin
      .from("route_points")
      .insert({
        route_id: nieuweRoute.id,
        order_index: punt.order_index,
        type: punt.type,
        name: punt.name,
        description: punt.description ?? null,
        latitude: punt.latitude,
        longitude: punt.longitude,
        radius_meters: punt.radius_meters ?? 30,
        points: punt.points ?? 0,
        image_path: punt.image_path ?? null,
        sound_path: punt.sound_path ?? null,
        // QR-ontgrendeling: nieuwe geheime code (de punten krijgen nieuwe id's, oude QR-codes werken niet meer)
        qr_unlock_enabled: !!punt.qr_unlock_enabled,
        qr_secret: punt.qr_unlock_enabled ? crypto.randomUUID().replace(/-/g, "").slice(0, 12) : null,
      })
      .select("id")
      .single();
    if (puntError || !nieuwPunt) continue;
    nieuwPuntVoorVolgorde.set(punt.order_index, nieuwPunt.id);
    if (!punt.vraag) continue;

    const { data: nieuweVraag, error: vraagError } = await admin
      .from("questions")
      .insert({
        route_point_id: nieuwPunt.id,
        type: punt.vraag.type,
        question_text: punt.vraag.question_text,
        question_image_path: punt.vraag.question_image_path ?? null,
        points: punt.vraag.points ?? 0,
        correct_text_answers: punt.vraag.correct_text_answers ?? null,
        numeric_answer: punt.vraag.numeric_answer ?? null,
        numeric_tolerance: punt.vraag.numeric_tolerance ?? null,
      })
      .select("id")
      .single();
    if (vraagError || !nieuweVraag) continue;
    // Husselen, geluid en tijdslimiet (migratie 014); zonder die migratie gewoon overslaan
    if (punt.vraag.antwoorden_husselen || punt.vraag.geluid_pad || punt.vraag.tijdslimiet_seconden) {
      await admin.from("questions").update({
        antwoorden_husselen: !!punt.vraag.antwoorden_husselen, geluid_pad: punt.vraag.geluid_pad ?? null, tijdslimiet_seconden: punt.vraag.tijdslimiet_seconden ?? null,
      }).eq("id", nieuweVraag.id);
    }

    if (Array.isArray(punt.vraag.antwoord_opties) && punt.vraag.antwoord_opties.length > 0) {
      await admin.from("answer_options").insert(
        punt.vraag.antwoord_opties.map((opt) => ({
          question_id: nieuweVraag.id,
          order_index: opt.order_index,
          color: opt.color,
          answer_type: opt.answer_type,
          text: opt.text ?? null,
          image_path: opt.image_path ?? null,
          is_correct: opt.is_correct ?? false,
          ...(typeof opt.punten === "number" && Number.isFinite(opt.punten) ? { punten: Math.round(opt.punten) } : {}),
          ...(uitlegKan && opt.uitleg ? { uitleg: String(opt.uitleg).slice(0, 200) } : {}),
        })),
      );
    }
  }

  // Zelfgekozen instappunten (verspreid): van volgorde terug naar de nieuwe punt-id's
  const instappunten = Object.fromEntries(Object.entries(body.route.instappunten_volgorde ?? {})
    .map(([team, volgorde]) => [team, nieuwPuntVoorVolgorde.get(Number(volgorde))])
    .filter(([, id]) => !!id));
  if (Object.keys(instappunten).length) await admin.from("routes").update({ instappunten }).eq("id", nieuweRoute.id);

  // Items op de kaart
  const items = (body.items ?? []).filter((i) => ITEM_TYPES.includes(i.type) && geldigePlek(i.latitude, i.longitude));
  if (items.length) {
    await admin.from("special_items").insert(items.map((i) => ({
      route_id: nieuweRoute.id, type: i.type, name: i.name ?? "Speciaal item", latitude: i.latitude, longitude: i.longitude,
      radius_meters: i.radius_meters ?? 15, points_effect: i.points_effect ?? 0,
    })));
  }

  // ⚡ Bonusvragen (migratie 004); zonder migratie: overslaan
  const bonus = (body.bonusvragen ?? []).map((b) => bonusVelden(b)).filter((b): b is NonNullable<typeof b> => !!b);
  if (bonus.length) await admin.from("bonus_vragen").insert(bonus.map((b) => ({ ...b, route_id: nieuweRoute.id }))).then(() => undefined, () => undefined);

  return NextResponse.json({ id: nieuweRoute.id });
}
