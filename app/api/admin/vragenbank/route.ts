import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Vragenbank: alle vragen uit alle routes, om in de vraag-editor opnieuw te gebruiken.
// ?zonder=<punt-id> laat de vraag van het punt dat je nu bewerkt weg.
export async function GET(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const zonder = request.nextUrl.searchParams.get("zonder");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select("id, route_point_id, type, question_text, question_image_path, points, correct_text_answers, numeric_answer, numeric_tolerance, answer_options(color, text, image_path, is_correct, punten), route_points!inner(name, order_index, routes!inner(id, name))")
    .limit(1000);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  type Rij = {
    id: string; route_point_id: string; type: string; question_text: string | null; question_image_path: string | null; points: number;
    correct_text_answers: string[] | null; numeric_answer: number | null; numeric_tolerance: number | null;
    answer_options: { color: string; text: string | null; image_path: string | null; is_correct: boolean; punten: number | null }[];
    route_points: { name: string; order_index: number; routes: { id: string; name: string } };
  };
  const kleurVolgorde = ["geel", "blauw", "rood", "groen"];
  const vragen = ((data ?? []) as unknown as Rij[])
    .filter((v) => v.route_point_id !== zonder && (v.question_text?.trim() || v.question_image_path))
    .map((v) => ({
      id: v.id,
      type: v.type,
      question_text: v.question_text ?? "",
      question_image_path: v.question_image_path,
      points: v.points,
      correct_text_answers: v.correct_text_answers,
      numeric_answer: v.numeric_answer,
      numeric_tolerance: v.numeric_tolerance,
      answer_options: [...(v.answer_options ?? [])].sort((a, b) => kleurVolgorde.indexOf(a.color) - kleurVolgorde.indexOf(b.color)),
      punt_naam: v.route_points.name,
      route_naam: v.route_points.routes.name,
      volgorde: v.route_points.order_index,
    }))
    .sort((a, b) => a.route_naam.localeCompare(b.route_naam) || a.volgorde - b.volgorde);
  return NextResponse.json({ vragen });
}
