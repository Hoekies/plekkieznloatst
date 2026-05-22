import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

type AntwoordOptieRij = {
  order_index: number;
  color: string;
  answer_type: string;
  text: string | null;
  image_path: string | null;
  is_correct: boolean;
};

type VraagRij = {
  type: string;
  question_text: string;
  question_image_path: string | null;
  points: number;
  correct_text_answers: string[] | null;
  numeric_answer: number | null;
  numeric_tolerance: number | null;
  answer_options: AntwoordOptieRij[];
};

type PuntRij = {
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
  questions: VraagRij[];
};

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: route } = await admin
    .from("routes")
    .select("name, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!route) return NextResponse.json({ fout: "Route niet gevonden" }, { status: 404 });

  const { data: punten } = await admin
    .from("route_points")
    .select(`
      order_index, type, name, description, latitude, longitude, radius_meters, points, image_path, sound_path,
      questions(
        type, question_text, question_image_path, points, correct_text_answers, numeric_answer, numeric_tolerance,
        answer_options(order_index, color, answer_type, text, image_path, is_correct)
      )
    `)
    .eq("route_id", params.id)
    .order("order_index");

  const exportData = {
    _version: 1,
    route: { name: route.name, status: route.status },
    route_punten: ((punten ?? []) as unknown as PuntRij[]).map((punt) => {
      const vraag = punt.questions?.[0] ?? null;
      return {
        order_index: punt.order_index,
        type: punt.type,
        name: punt.name,
        description: punt.description,
        latitude: punt.latitude,
        longitude: punt.longitude,
        radius_meters: punt.radius_meters,
        points: punt.points,
        image_path: punt.image_path,
        sound_path: punt.sound_path,
        vraag: vraag ? {
          type: vraag.type,
          question_text: vraag.question_text,
          question_image_path: vraag.question_image_path,
          points: vraag.points,
          correct_text_answers: vraag.correct_text_answers,
          numeric_answer: vraag.numeric_answer,
          numeric_tolerance: vraag.numeric_tolerance,
          antwoord_opties: vraag.answer_options.map((opt) => ({
            order_index: opt.order_index,
            color: opt.color,
            answer_type: opt.answer_type,
            text: opt.text,
            image_path: opt.image_path,
            is_correct: opt.is_correct,
          })),
        } : null,
      };
    }),
  };

  const bestandsnaam = route.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${bestandsnaam}.json"`,
    },
  });
}
