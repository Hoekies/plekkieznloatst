import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

type Params = { params: { id: string; pid: string } };

async function checkAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const rol = user?.app_metadata?.rol;
  return rol === "admin" ? user : null;
}

export async function GET(_: NextRequest, { params }: Params) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data: vraag } = await admin
    .from("questions")
    .select("*, answer_options(*)")
    .eq("route_point_id", params.pid)
    .order("order_index", { referencedTable: "answer_options" })
    .maybeSingle();

  return NextResponse.json(vraag ?? null);
}

// PUT = aanmaken of volledig vervangen
export async function PUT(request: NextRequest, { params }: Params) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const body = await request.json();
  const admin = createAdminClient();

  // Valideer exact 1 correct antwoord bij meerkeuze
  if (body.type !== "open" && body.type !== "foto_opdracht") {
    const aantalCorrect = (body.antwoorden ?? []).filter((a: { is_correct: boolean }) => a.is_correct).length;
    if (aantalCorrect !== 1) {
      return NextResponse.json({ fout: "Selecteer precies één correct antwoord" }, { status: 400 });
    }
    if ((body.antwoorden ?? []).length !== 4) {
      return NextResponse.json({ fout: "Er zijn precies 4 antwoorden vereist" }, { status: 400 });
    }
  }

  // Bestaande vraag opzoeken
  const { data: bestaand } = await admin
    .from("questions")
    .select("id")
    .eq("route_point_id", params.pid)
    .maybeSingle();

  let vraagId: string;

  if (bestaand) {
    // Updaten
    await admin.from("questions").update({
      type: body.type,
      question_text: body.question_text,
      question_image_path: body.question_image_path ?? null,
      points: body.points ?? 0,
      correct_text_answers: body.correct_text_answers ?? null,
      numeric_answer: body.numeric_answer ?? null,
      numeric_tolerance: body.numeric_tolerance ?? null,
    }).eq("id", bestaand.id);
    vraagId = bestaand.id;

    // Antwoorden vervangen
    const { error: deleteFout } = await admin.from("answer_options").delete().eq("question_id", vraagId);
    if (deleteFout) return NextResponse.json({ fout: `Antwoorden verwijderen mislukt: ${deleteFout.message}` }, { status: 500 });
  } else {
    // Aanmaken
    const { data: nieuw, error } = await admin.from("questions").insert({
      route_point_id: params.pid,
      type: body.type,
      question_text: body.question_text,
      question_image_path: body.question_image_path ?? null,
      points: body.points ?? 0,
      correct_text_answers: body.correct_text_answers ?? null,
      numeric_answer: body.numeric_answer ?? null,
      numeric_tolerance: body.numeric_tolerance ?? null,
    }).select().single();
    if (error || !nieuw) return NextResponse.json({ fout: error?.message }, { status: 500 });
    vraagId = nieuw.id;
  }

  // Antwoorden invoegen (alleen bij meerkeuzevragen)
  if (body.type !== "open" && body.type !== "foto_opdracht" && body.antwoorden?.length) {
    const { error: insertFout } = await admin.from("answer_options").insert(
      body.antwoorden.map((a: { color: string; answer_type: string; text: string | null; image_path: string | null; is_correct: boolean }, i: number) => ({
        question_id: vraagId,
        order_index: i + 1,
        color: a.color,
        answer_type: a.answer_type,
        text: a.text ?? null,
        image_path: a.image_path ?? null,
        is_correct: a.is_correct,
      }))
    );
    if (insertFout) return NextResponse.json({ fout: `Antwoorden opslaan mislukt: ${insertFout.message}` }, { status: 500 });
  }

  // Teruggeven inclusief antwoorden
  const { data: resultaat } = await admin
    .from("questions")
    .select("*, answer_options(*)")
    .eq("id", vraagId)
    .order("order_index", { referencedTable: "answer_options" })
    .single();

  return NextResponse.json(resultaat);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  await admin.from("questions").delete().eq("route_point_id", params.pid);
  return NextResponse.json({ ok: true });
}
