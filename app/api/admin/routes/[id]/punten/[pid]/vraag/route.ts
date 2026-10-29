import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

type Params = { params: { id: string; pid: string } };

export async function GET(_: NextRequest, { params }: Params) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data: vraag, error } = await admin
    .from("questions")
    .select("*, answer_options(*)")
    .eq("route_point_id", params.pid)
    .order("order_index", { referencedTable: "answer_options" })
    .maybeSingle();
  // Een leesfout is niet hetzelfde als "nog geen vraag": anders opende de editor een leeg formulier
  if (error) return NextResponse.json({ fout: "De vraag kon niet worden geladen" }, { status: 500 });

  return NextResponse.json(vraag ?? null);
}

type Antwoord = { color: string; answer_type: string; text: string | null; image_path: string | null; is_correct: boolean; punten?: number | null; uitleg?: string | null };

// PUT = aanmaken of volledig vervangen
export async function PUT(request: NextRequest, { params }: Params) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const body = await request.json();
  const admin = createAdminClient();

  // ── Controleren vóór er iets wordt opgeslagen (zelfde eisen als de editor) ──
  const vraagTekst = typeof body.question_text === "string" ? body.question_text.trim() : "";
  if (!vraagTekst && body.type !== "foto_opdracht") return NextResponse.json({ fout: "Vul de vraag in" }, { status: 400 });
  const punten = Number(body.points ?? 0);
  if (!Number.isFinite(punten) || Math.abs(punten) > 10000) return NextResponse.json({ fout: "Ongeldig aantal punten" }, { status: 400 });
  if (body.type === "open") {
    const getal = body.numeric_answer;
    const metGetal = getal !== null && getal !== undefined;
    if (metGetal && !Number.isFinite(Number(getal))) return NextResponse.json({ fout: "Het goede getal is ongeldig" }, { status: 400 });
    if (metGetal && body.numeric_tolerance != null && !(Number(body.numeric_tolerance) >= 0)) return NextResponse.json({ fout: "De marge moet 0 of meer zijn" }, { status: 400 });
    const teksten = (body.correct_text_answers ?? []).filter((t: unknown) => typeof t === "string" && t.trim());
    if (!metGetal && !teksten.length) return NextResponse.json({ fout: "Vul minstens één goed antwoord in" }, { status: 400 });
  }

  // 🔤 Anagram: het woord (de spelers zien de letters door elkaar)
  if (body.type === "anagram") {
    const woord = (body.correct_text_answers ?? []).find((t: unknown) => typeof t === "string" && t.trim());
    if (!woord || woord.replace(/\s+/g, "").length < 3) return NextResponse.json({ fout: "Vul het woord in (minstens 3 letters)" }, { status: 400 });
  }
  // 🗺️ Kaartvraag: de goede plek en de straal
  if (body.type === "kaartvraag") {
    if (!Number.isFinite(Number(body.kaart_lat)) || !Number.isFinite(Number(body.kaart_lng))) return NextResponse.json({ fout: "Tik op de kaart waar het goede antwoord ligt" }, { status: 400 });
  }
  // 🔀 Volgorde: 3 of 4 items, in de goede volgorde
  if (body.type === "volgorde") {
    const n = (body.antwoorden ?? []).length;
    if (n < 3 || n > 4) return NextResponse.json({ fout: "Een volgordevraag heeft 3 of 4 items" }, { status: 400 });
    body.antwoorden = body.antwoorden.map((a: { is_correct: boolean }) => ({ ...a, is_correct: false, punten: null }));
  }
  // 🗳️ Stemvraag: 2 tot 4 keuzes, geen goed antwoord (de meerderheid wint)
  else if (body.type === "stemvraag") {
    const n = (body.antwoorden ?? []).length;
    if (n < 2 || n > 4) return NextResponse.json({ fout: "Een stemvraag heeft 2 tot 4 keuzes" }, { status: 400 });
    body.antwoorden = body.antwoorden.map((a: { is_correct: boolean }) => ({ ...a, is_correct: false, punten: null }));
  }
  // Meerkeuze: minstens één goed antwoord (meer mag; niet allemaal, anders is er niets te raden)
  else if (body.type !== "open" && body.type !== "foto_opdracht" && body.type !== "anagram" && body.type !== "kaartvraag") {
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

  // 💬 Uitleg per antwoord: kan pas na migratie 023
  const metUitleg = (body.antwoorden ?? []).some((a: { uitleg?: string | null }) => typeof a.uitleg === "string" && a.uitleg.trim());
  if (metUitleg) {
    const { error } = await admin.from("answer_options").select("uitleg").limit(1);
    if (error) return NextResponse.json({ fout: "Uitleg per antwoord kan pas na migratie 023: draai dat deel uit 001_schema.sql in Supabase → SQL Editor (of haal de uitleg weg)." }, { status: 400 });
  }

  // Bestaande vraag opzoeken
  const { data: bestaand, error: leesFout } = await admin
    .from("questions")
    .select("*, answer_options(id, order_index)")
    .eq("route_point_id", params.pid)
    .maybeSingle();
  if (leesFout) return NextResponse.json({ fout: "De bestaande vraag kon niet worden gelezen; er is niets veranderd" }, { status: 500 });

  const velden = {
    type: body.type,
    question_text: body.question_text,
    question_image_path: body.question_image_path ?? null,
    points: Math.round(punten),
    correct_text_answers: body.correct_text_answers ?? null,
    numeric_answer: body.numeric_answer ?? null,
    numeric_tolerance: body.numeric_tolerance ?? null,
    // 🗺️ Kaartvraag (migratie 009): alleen meesturen als het er een is, zodat de rest ook zonder die migratie werkt
    ...(body.type === "kaartvraag" ? {
      kaart_lat: Number(body.kaart_lat), kaart_lng: Number(body.kaart_lng),
      kaart_straal: Math.min(2000, Math.max(5, Math.round(Number(body.kaart_straal) || 50))),
    } : {}),
  };
  const typeFout = (m: string) => /type_check|kaart_/.test(m)
    ? ["anagram", "volgorde", "kaartvraag"].includes(body.type) ? "Draai eerst migratie 009 (spelplezier deel 2) in Supabase" : "Draai eerst migratie 016 (stemvraag) in Supabase"
    : m;

  let vraagId: string;
  const metOpties = body.type !== "open" && body.type !== "foto_opdracht" && body.type !== "anagram" && body.type !== "kaartvraag";
  const nieuweOpties = (metOpties ? (body.antwoorden ?? []) : []) as Antwoord[];
  const optieRij = (a: Antwoord, i: number) => ({
    order_index: i + 1,
    color: a.color,
    answer_type: a.answer_type,
    text: a.text ?? null,
    image_path: a.image_path ?? null,
    is_correct: a.is_correct,
    punten: typeof a.punten === "number" && Number.isFinite(a.punten) ? Math.round(a.punten) : null,
    ...(metUitleg ? { uitleg: a.uitleg?.trim().slice(0, 200) || null } : {}),
  });

  if (bestaand) {
    vraagId = bestaand.id;
    // De antwoorden worden op hun plek bijgewerkt in plaats van gewist en opnieuw gemaakt: ze houden hun id,
    // zodat al gegeven antwoorden van teams blijven kloppen en een mislukte stap de oude vraag niet leeg
    // achterlaat. Eerst de antwoorden, dan de vraag zelf, en pas aan het eind overtollige antwoorden weg.
    const oud = ((bestaand.answer_options ?? []) as { id: string; order_index: number }[]).sort((a, b) => a.order_index - b.order_index);
    // Eerst de antwoorden die er nog niet waren: mislukt dat, dan is er nog niets aan de oude vraag veranderd
    const erbij = nieuweOpties.map((a, i) => ({ a, i })).filter(({ i }) => !oud[i]);
    if (erbij.length) {
      // Eén opdracht: de database voegt ze allemaal of geen enkele in
      const { error } = await admin.from("answer_options")
        .insert(erbij.map(({ a, i }) => ({ question_id: vraagId, ...optieRij(a, i) })));
      if (error) return NextResponse.json({ fout: `Antwoorden opslaan mislukt: ${error.message}. De vraag is niet veranderd.` }, { status: 500 });
    }
    for (let i = 0; i < Math.min(oud.length, nieuweOpties.length); i++) {
      const { error } = await admin.from("answer_options").update(optieRij(nieuweOpties[i], i)).eq("id", oud[i].id);
      if (error) return NextResponse.json({ fout: `Antwoorden opslaan mislukt: ${error.message}` }, { status: 500 });
    }
    const { error: updateFout } = await admin.from("questions").update(velden).eq("id", vraagId);
    if (updateFout) return NextResponse.json({ fout: typeFout(updateFout.message) }, { status: 500 });
    const over = oud.slice(nieuweOpties.length).map((o) => o.id);
    if (over.length) {
      const { error: deleteFout } = await admin.from("answer_options").delete().in("id", over);
      // Een team koos al eens zo'n antwoord: dan blijft het bestaan (verborgen achter de nieuwe vraag)
      if (deleteFout && !/foreign key|23503/i.test(deleteFout.message + (deleteFout.code ?? ""))) {
        return NextResponse.json({ fout: `Oude antwoorden opruimen mislukt: ${deleteFout.message}` }, { status: 500 });
      }
    }
  } else {
    // Aanmaken
    const { data: nieuw, error } = await admin.from("questions").insert({ route_point_id: params.pid, ...velden }).select().single();
    if (error || !nieuw) {
      // Net tegelijk aangemaakt (unieke regel uit migratie 002): dan opnieuw opslaan als wijziging
      if (error?.code === "23505") return NextResponse.json({ fout: "Deze vraag werd net al aangemaakt: sla nog een keer op" }, { status: 409 });
      return NextResponse.json({ fout: typeFout(error?.message ?? "Vraag aanmaken mislukt") }, { status: 500 });
    }
    vraagId = nieuw.id;
    if (nieuweOpties.length) {
      const { error: insertFout } = await admin.from("answer_options").insert(nieuweOpties.map((a, i) => ({ question_id: vraagId, ...optieRij(a, i) })));
      if (insertFout) {
        // Geen halve vraag achterlaten
        await admin.from("questions").delete().eq("id", vraagId);
        return NextResponse.json({ fout: `Antwoorden opslaan mislukt: ${insertFout.message}` }, { status: 500 });
      }
    }
  }

  // Per vraag: husselen, geluid en tijdslimiet (migratie 014). Los opgeslagen, zodat een vraag zonder deze
  // opties ook werkt als de migratie nog niet gedraaid is.
  const limiet = Number(body.tijdslimiet_seconden);
  // 🔀 Husselen geldt voor de hele route (⚙️ Instellingen → 🎮 Spel): overnemen van de andere vragen van de route.
  // Is dit de enige vraag, dan de eigen instelling houden.
  const { data: anderePunten } = await admin.from("route_points").select("id").eq("route_id", params.id).neq("id", params.pid);
  const { data: andereVragen } = anderePunten?.length
    ? await admin.from("questions").select("antwoorden_husselen").in("route_point_id", anderePunten.map((p) => p.id))
    : { data: [] as { antwoorden_husselen: boolean | null }[] };
  const eigenHusselen = !!(bestaand as { antwoorden_husselen?: boolean | null } | null)?.antwoorden_husselen;
  const extra = {
    antwoorden_husselen: andereVragen?.length ? andereVragen.some((v) => v.antwoorden_husselen) : eigenHusselen,
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
  const { error } = await admin.from("questions").delete().eq("route_point_id", params.pid);
  if (error) return NextResponse.json({ fout: `Vraag verwijderen lukte niet: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true });
}
