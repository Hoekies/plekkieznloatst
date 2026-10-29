import { NextRequest, NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { spelGepauzeerd, PAUZE_FOUT } from "@/lib/eindtijd";
import { plezierInstellingen } from "@/lib/spelplezier";

// 🃏 Jokers (spelplezier deel 2, migratie 009). GET = hoeveel jokers dit team nog heeft.
// POST { soort: "5050", route_point_id } = twee foute antwoorden weg bij een meerkeuzevraag (de ids terug);
// POST { soort: "over", route_point_id } = de vraag overslaan zonder punten (het punt is daarna afgerond).
// Het aantal gebruikte jokers telt met een voorwaardelijke update op het oude aantal: dubbel tikken telt nooit twee keer.

async function stand(ctx: NonNullable<Awaited<ReturnType<typeof haalSpelerSessie>>>) {
  const { data: route } = await ctx.admin.from("routes").select("*").eq("id", ctx.sessie!.route_id).maybeSingle();
  const inst = plezierInstellingen(route).jokers;
  const s = ctx.sessie as unknown as { jokers_5050?: number; jokers_over?: number };
  return { inst, gebruikt5050: s.jokers_5050 ?? 0, gebruiktOver: s.jokers_over ?? 0 };
}

export async function GET() {
  const ctx = await haalSpelerSessie();
  if (!ctx?.sessie) return NextResponse.json({ aan: false });
  const { inst, gebruikt5050, gebruiktOver } = await stand(ctx);
  return NextResponse.json({ aan: inst.aan, vijftig: Math.max(0, inst.vijftig - gebruikt5050), over: Math.max(0, inst.over - gebruiktOver) });
}

export async function POST(request: NextRequest) {
  const ctx = await haalSpelerSessie();
  if (!ctx?.sessie) return NextResponse.json({ fout: "Geen actief spel" }, { status: 403 });
  const { admin, sessie } = ctx;
  if (await spelGepauzeerd(admin, sessie.route_id)) return NextResponse.json({ fout: PAUZE_FOUT, pauze: true }, { status: 409 });
  const body = await request.json().catch(() => ({})) as { soort?: string; route_point_id?: string };
  const { inst, gebruikt5050, gebruiktOver } = await stand(ctx);
  if (!inst.aan) return NextResponse.json({ fout: "Jokers staan uit bij deze route" }, { status: 400 });

  const { data: punt } = await admin.from("route_points").select("id, type").eq("id", String(body.route_point_id ?? "")).eq("route_id", sessie.route_id).maybeSingle();
  if (!punt) return NextResponse.json({ fout: "Ongeldig punt" }, { status: 400 });
  const { data: voortgang } = await admin.from("player_point_progress").select("id, answered_at").eq("session_id", sessie.id).eq("route_point_id", punt.id).maybeSingle();
  if (!voortgang) return NextResponse.json({ fout: "Je bent nog niet bij dit punt" }, { status: 400 });
  if (voortgang.answered_at) return NextResponse.json({ fout: "Dit punt is al afgerond" }, { status: 409 });
  const { data: vraag } = await admin.from("questions").select("id, type, answer_options(id, is_correct)").eq("route_point_id", punt.id).maybeSingle();
  if (!vraag) return NextResponse.json({ fout: "Bij dit punt hoort geen vraag" }, { status: 400 });

  if (body.soort === "5050") {
    if (vraag.type !== "meerkeuze_tekst" && vraag.type !== "meerkeuze_afbeelding") return NextResponse.json({ fout: "De 50/50-joker werkt alleen bij een meerkeuzevraag" }, { status: 400 });
    if (gebruikt5050 >= inst.vijftig) return NextResponse.json({ fout: "Jullie 50/50-jokers zijn op" }, { status: 409 });
    const fout = ((vraag.answer_options ?? []) as { id: string; is_correct: boolean }[]).filter((o) => !o.is_correct);
    if (fout.length < 2) return NextResponse.json({ fout: "Bij deze vraag valt er niets weg te strepen" }, { status: 400 });
    const { data: gezet } = await admin.from("player_sessions").update({ jokers_5050: gebruikt5050 + 1 }).eq("id", sessie.id).eq("jokers_5050", gebruikt5050).select("id");
    if (!gezet?.length) return NextResponse.json({ fout: "Probeer het opnieuw" }, { status: 409 });
    // Twee willekeurige foute antwoorden weg; er blijft altijd minstens één fout antwoord staan
    const weg = [...fout].sort(() => Math.random() - 0.5).slice(0, Math.min(2, fout.length - 1)).map((o) => o.id);
    return NextResponse.json({ ok: true, weg });
  }

  if (body.soort === "over") {
    if (punt.type === "eindpunt" || vraag.type === "stemvraag") return NextResponse.json({ fout: "Deze vraag kun je niet overslaan" }, { status: 400 });
    if (gebruiktOver >= inst.over) return NextResponse.json({ fout: "Jullie overslaan-jokers zijn op" }, { status: 409 });
    const { data: gezet } = await admin.from("player_sessions").update({ jokers_over: gebruiktOver + 1 }).eq("id", sessie.id).eq("jokers_over", gebruiktOver).select("id");
    if (!gezet?.length) return NextResponse.json({ fout: "Probeer het opnieuw" }, { status: 409 });
    // Het punt afronden zonder punten (geen goed of fout: de reeks loopt gewoon door)
    const { data: af } = await admin.from("player_point_progress")
      .update({ answered_at: new Date().toISOString(), is_correct: null, points_awarded: 0, open_answer_text: "⏭️ overgeslagen" })
      .eq("id", voortgang.id).is("answered_at", null).select().maybeSingle();
    if (!af) {
      await admin.from("player_sessions").update({ jokers_over: gebruiktOver }).eq("id", sessie.id);
      return NextResponse.json({ fout: "Dit punt is al afgerond" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, voortgang: af });
  }
  return NextResponse.json({ fout: "Onbekende joker" }, { status: 400 });
}
