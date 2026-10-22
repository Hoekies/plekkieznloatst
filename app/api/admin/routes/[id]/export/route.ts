import { NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Export van een complete route (versie 2): speltype en alle instellingen, punten met vraag en
// antwoorden, de items op de kaart en een lijst met afbeeldingen. De afbeeldingen zelf haalt de
// browser daarna op en pakt ze in het bestand in (zo blijft dit antwoord klein).

// Instellingen die bij het spelen horen en niet mee gaan naar een nieuwe route
const NIET_MEE = new Set(["id", "name", "status", "is_active", "created_at", "updated_at", "uitslag_vrijgegeven",
  "tussenstand_trigger_at", "items_last_rotated_at", "instappunten"]);

type Optie = { order_index: number; color: string; answer_type: string; text: string | null; image_path: string | null; is_correct: boolean; punten?: number | null };
type Vraag = {
  type: string; question_text: string; question_image_path: string | null; points: number;
  correct_text_answers: string[] | null; numeric_answer: number | null; numeric_tolerance: number | null; answer_options: Optie[];
  // Migratie 014 (ontbreken als die nog niet gedraaid is)
  antwoorden_husselen?: boolean; geluid_pad?: string | null; tijdslimiet_seconden?: number | null;
};
type Punt = {
  id: string; order_index: number; type: string; name: string; description: string | null; latitude: number; longitude: number;
  radius_meters: number; points: number; image_path: string | null; sound_path: string | null; qr_unlock_enabled: boolean; questions: Vraag[];
};

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (!user || user.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("*").eq("id", params.id).maybeSingle();
  if (!route) return NextResponse.json({ fout: "Route niet gevonden" }, { status: 404 });

  const [{ data: punten }, { data: items }] = await Promise.all([
    admin.from("route_points")
      .select(`id, order_index, type, name, description, latitude, longitude, radius_meters, points, image_path, sound_path, qr_unlock_enabled,
        questions(*, answer_options(*))`)
      .eq("route_id", params.id).order("order_index"),
    admin.from("special_items").select("type, name, latitude, longitude, radius_meters, points_effect").eq("route_id", params.id).eq("is_startitem", false),
  ]);
  const lijst = (punten ?? []) as unknown as Punt[];

  // Zelfgekozen instappunten verwijzen naar punt-id's; in het bestand naar de volgorde
  const volgordeVan = new Map(lijst.map((p) => [p.id, p.order_index]));
  const instappunten = Object.fromEntries(Object.entries((route.instappunten ?? {}) as Record<string, string>)
    .filter(([, id]) => volgordeVan.has(id)).map(([team, id]) => [team, volgordeVan.get(id)!]));

  const afbeeldingen = new Set<string>();
  const onthoud = (bucket: string, pad: string | null) => { if (pad) afbeeldingen.add(`${bucket}/${pad}`); };

  const exportData = {
    _version: 2,
    app: "PointRush",
    geexporteerd_op: new Date().toISOString(),
    route: {
      name: route.name,
      status: route.status,
      instellingen: Object.fromEntries(Object.entries(route).filter(([k]) => !NIET_MEE.has(k))),
      instappunten_volgorde: instappunten,
    },
    route_punten: lijst.map((p) => {
      onthoud("route-afbeeldingen", p.image_path);
      const vraag = p.questions?.[0] ?? null;
      if (vraag) {
        onthoud("vraag-afbeeldingen", vraag.question_image_path);
        onthoud("vraag-geluid", vraag.geluid_pad ?? null);
        vraag.answer_options.forEach((o) => onthoud("vraag-afbeeldingen", o.image_path));
      }
      return {
        order_index: p.order_index, type: p.type, name: p.name, description: p.description,
        latitude: p.latitude, longitude: p.longitude, radius_meters: p.radius_meters, points: p.points,
        image_path: p.image_path, sound_path: p.sound_path, qr_unlock_enabled: p.qr_unlock_enabled,
        vraag: vraag ? {
          type: vraag.type, question_text: vraag.question_text, question_image_path: vraag.question_image_path, points: vraag.points,
          correct_text_answers: vraag.correct_text_answers, numeric_answer: vraag.numeric_answer, numeric_tolerance: vraag.numeric_tolerance,
          antwoorden_husselen: vraag.antwoorden_husselen ?? false, geluid_pad: vraag.geluid_pad ?? null, tijdslimiet_seconden: vraag.tijdslimiet_seconden ?? null,
          antwoord_opties: [...vraag.answer_options].sort((a, b) => a.order_index - b.order_index).map((o) => ({
            order_index: o.order_index, color: o.color, answer_type: o.answer_type, text: o.text,
            image_path: o.image_path, is_correct: o.is_correct, punten: o.punten ?? null,
          })),
        } : null,
      };
    }),
    items: items ?? [],
    // "bucket/pad"; de browser vult hier per afbeelding { type, data (base64) } in
    afbeeldingen_lijst: [...afbeeldingen],
  };

  return NextResponse.json(exportData);
}
