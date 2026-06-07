import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

type AntwoordOptieImport = {
  order_index: number;
  color: string;
  answer_type: string;
  text: string | null;
  image_path: string | null;
  is_correct: boolean;
};

type VraagImport = {
  type: string;
  question_text: string;
  question_image_path: string | null;
  points: number;
  correct_text_answers: string[] | null;
  numeric_answer: number | null;
  numeric_tolerance: number | null;
  antwoord_opties: AntwoordOptieImport[];
};

type PuntImport = {
  order_index: number;
  type: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  points: number;
  image_path: string | null;
  sound_path: string | null;
  vraag: VraagImport | null;
};

type RouteExport = {
  _version: number;
  route: { name: string; status: string };
  route_punten: PuntImport[];
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  let body: RouteExport;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldig JSON-bestand" }, { status: 400 });
  }

  if (body._version !== 1 || typeof body.route?.name !== "string" || !Array.isArray(body.route_punten)) {
    return NextResponse.json({ fout: "Ongeldig export-bestand (verkeerde versie of structuur)" }, { status: 400 });
  }

  const safePath = /^[\w\-\/]+\.(jpg|jpeg|png|mp3|webp)$/i;
  for (const punt of body.route_punten) {
    const lat = Number(punt.latitude); const lng = Number(punt.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return NextResponse.json({ fout: `Ongeldig coördinaat bij punt: ${punt.name}` }, { status: 400 });
    }
    if (punt.image_path && !safePath.test(punt.image_path)) {
      return NextResponse.json({ fout: `Ongeldig image_path bij punt: ${punt.name}` }, { status: 400 });
    }
  }

  const admin = createAdminClient();

  // Route aanmaken — altijd als concept, nooit actief
  const { data: nieuweRoute, error: routeError } = await admin
    .from("routes")
    .insert({ name: body.route.name, status: "concept", is_active: false })
    .select("id")
    .single();

  if (routeError || !nieuweRoute) {
    return NextResponse.json({ fout: "Kon route niet aanmaken" }, { status: 500 });
  }

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
      })
      .select("id")
      .single();

    if (puntError || !nieuwPunt) continue;

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
        }))
      );
    }
  }

  return NextResponse.json({ id: nieuweRoute.id });
}
