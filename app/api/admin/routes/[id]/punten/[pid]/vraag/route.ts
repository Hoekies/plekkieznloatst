import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

type Params = { params: { id: string; pid: string } };

export async function GET(_: NextRequest, { params }: Params) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

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
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const body = await request.json();
  const admin = createAdminClient();

  // 🗳️ Stemvraag: 2 tot 4 keuzes, geen goed antwoord (de meerderheid wint)
  if (body.type === "stemvraag") {
    const n = (body.antwoorden ?? []).length;
    if (n < 2 || n > 4) return NextResponse.json({ fout: "Een stemvraag heeft 2 tot 4 keuzes" }, { status: 400 });
    body.antwoorden = body.antwoorden.map((a: { is_correct: boolean }) => ({ ...a, is_correct: false, punten: null }));
  }
  // Meerkeuze: minstens één goed antwoord (meer mag; niet allemaal, anders is er niets te raden)
  else if (body.type !== "open" && body.type !== "foto_opdracht") {
    const aantalCorrect = (body.antwoorden ?? []).filter((a: { is_correct: boolean }) => a.is_correct).length;
    if (aantalCorrect < 1) {
      return NextResponse.json({ fout: "Maak minstens één antwoord goed (tik op het rondje)" }, { status: 400 });
    }
    if (aantalCorrect === (body.antwoorden ?? []).length) {
      return NextResponse.json({ fout: "Alle antwoorden staan op goed: maak er minstens één fout" }, { status: 400 });
    }
    if ((body.antwoorden ?? []).length !== 4) {
      return NextResponse.json({ fout: "Er zijn precies 4 antwoorden vereist" }, { status: 400 });
    }
  }

  // 💬 Uitleg per antwoord: kan pas na migratie 023. Eerst controleren, want de antwoorden worden hieronder
  // eerst gewist en dan opnieuw ingevoegd (een mislukte invoeging zou ze kwijtmaken)
  const metUitleg = (body.antwoorden ?? []).some((a: { uitleg?: string | null }) => typeof a.uitleg === "string" && a.uitleg.trim());
  if (metUitleg) {
    const { error } = await admin.from("answer_options").select("uitleg").limit(1);
    if (error) return NextResponse.json({ fout: "Uitleg per antwoord kan pas na migratie 023: draai 023_antwoord_uitleg.sql in Supabase → SQL Editor (of haal de uitleg weg)." }, { status: 400 });
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
    const { error: updateFout } = await admin.from("questions").update({
      type: body.type,
      question_text: body.question_text,
      question_image_path: body.question_image_path ?? null,
      points: body.points ?? 0,
      correct_text_answers: body.correct_text_answers ?? null,
      numeric_answer: body.numeric_answer ?? null,
      numeric_tolerance: body.numeric_tolerance ?? null,
    }).eq("id", bestaand.id);
    if (updateFout) return NextResponse.json({ fout: /type_check/.test(updateFout.message) ? "Draai eerst migratie 016 (stemvraag) in Supabase" : updateFout.message }, { status: 500 });
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
    if (error || !nieuw) return NextResponse.json({ fout: error && /type_check/.test(error.message) ? "Draai eerst migratie 016 (stemvraag) in Supabase" : error?.message }, { status: 500 });
    vraagId = nieuw.id;
  }

  // Antwoorden invoegen (alleen bij meerkeuzevragen)
  if (body.type !== "open" && body.type !== "foto_opdracht" && body.antwoorden?.length) {
    const { error: insertFout } = await admin.from("answer_options").insert(
      body.antwoorden.map((a: { color: string; answer_type: string; text: string | null; image_path: string | null; is_correct: boolean; punten?: number | null; uitleg?: string | null }, i: number) => ({
        question_id: vraagId,
        order_index: i + 1,
        color: a.color,
        answer_type: a.answer_type,
        text: a.text ?? null,
        image_path: a.image_path ?? null,
        is_correct: a.is_correct,
        punten: typeof a.punten === "number" && Number.isFinite(a.punten) ? Math.round(a.punten) : null,
        ...(metUitleg ? { uitleg: a.uitleg?.trim().slice(0, 200) || null } : {}),
      }))
    );
    if (insertFout) return NextResponse.json({ fout: `Antwoorden opslaan mislukt: ${insertFout.message}` }, { status: 500 });
  }

  // Per vraag: husselen, geluid en tijdslimiet (migratie 014). Los opgeslagen, zodat een vraag zonder deze
  // opties ook werkt als de migratie nog niet gedraaid is.
  const limiet = Number(body.tijdslimiet_seconden);
  // 🔀 Husselen geldt voor de hele route (⚙️ Instellingen → 🎮 Spel): overnemen van de andere vragen van de route
  const { data: anderePunten } = await admin.from("route_points").select("id").eq("route_id", params.id).neq("id", params.pid);
  const { count: metHusselen } = anderePunten?.length
    ? await admin.from("questions").select("id", { count: "exact", head: true }).in("route_point_id", anderePunten.map((p) => p.id)).eq("antwoorden_husselen", true)
    : { count: 0 };
  const extra = {
    antwoorden_husselen: (metHusselen ?? 0) > 0,
    geluid_pad: typeof body.geluid_pad === "string" && body.geluid_pad ? body.geluid_pad : null,
    tijdslimiet_seconden: Number.isFinite(limiet) && limiet >= 10 ? Math.min(600, Math.round(limiet)) : null,
  };
  const { error: extraFout } = await admin.from("questions").update(extra).eq("id", vraagId);
  if (extraFout && (extra.antwoorden_husselen || extra.geluid_pad || extra.tijdslimiet_seconden)) {
    return NextResponse.json({ fout: "Vraag opgeslagen, maar husselen, geluid of tijdslimiet niet: draai eerst migratie 014 in Supabase" }, { status: 500 });
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
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  await admin.from("questions").delete().eq("route_point_id", params.pid);
  return NextResponse.json({ ok: true });
}
