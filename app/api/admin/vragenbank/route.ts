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
    .select("*, answer_options(color, text, image_path, is_correct, punten), route_points!inner(name, order_index, routes!inner(id, name))")
    .limit(1000);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  type Rij = {
    id: string; route_point_id: string; type: string; question_text: string | null; question_image_path: string | null; points: number;
    correct_text_answers: string[] | null; numeric_answer: number | null; numeric_tolerance: number | null;
    antwoorden_husselen?: boolean; geluid_pad?: string | null; tijdslimiet_seconden?: number | null;
    answer_options: { color: string; text: string | null; image_path: string | null; is_correct: boolean; punten: number | null }[];
    route_points: { name: string; order_index: number; routes: { id: string; name: string } };
  };
  // Favoriet en verborgen (migratie 007; zonder die tabel gewoon niets gemarkeerd)
  const { data: markeringen } = await admin.from("vragenbank_markering").select("question_id, favoriet, verborgen");
  const markering = new Map((markeringen ?? []).map((m) => [m.question_id as string, m as { favoriet: boolean; verborgen: boolean }]));

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
      antwoorden_husselen: v.antwoorden_husselen ?? false,
      geluid_pad: v.geluid_pad ?? null,
      tijdslimiet_seconden: v.tijdslimiet_seconden ?? null,
      answer_options: [...(v.answer_options ?? [])].sort((a, b) => kleurVolgorde.indexOf(a.color) - kleurVolgorde.indexOf(b.color)),
      punt_naam: v.route_points.name,
      route_naam: v.route_points.routes.name,
      volgorde: v.route_points.order_index,
      favoriet: markering.get(v.id)?.favoriet ?? false,
      verborgen: markering.get(v.id)?.verborgen ?? false,
    }))
    .sort((a, b) => a.route_naam.localeCompare(b.route_naam) || a.volgorde - b.volgorde);
  return NextResponse.json({ vragen });
}

// Favoriet aan/uit of uit de vragenbank halen / terugzetten: PATCH { id, favoriet?, verborgen? }
export async function PATCH(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });

  const admin = createAdminClient();
  const { data: huidig } = await admin.from("vragenbank_markering").select("favoriet, verborgen").eq("question_id", body.id).maybeSingle();
  const nieuw = {
    question_id: body.id,
    favoriet: typeof body.favoriet === "boolean" ? body.favoriet : huidig?.favoriet ?? false,
    verborgen: typeof body.verborgen === "boolean" ? body.verborgen : huidig?.verborgen ?? false,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("vragenbank_markering").upsert(nieuw, { onConflict: "question_id" });
  if (error) {
    const migratie = /vragenbank_markering/.test(error.message);
    return NextResponse.json({ fout: migratie ? "Draai eerst SQL-bestand 007 in Supabase" : error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, favoriet: nieuw.favoriet, verborgen: nieuw.verborgen });
}
