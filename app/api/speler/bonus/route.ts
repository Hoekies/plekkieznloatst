import { NextRequest, NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { spelGepauzeerd, PAUZE_FOUT } from "@/lib/eindtijd";
import { startDueBonus, openBonus, beloonMeerkeuze } from "@/lib/bonus-server";
import { bonusRestSeconden, type BonusAntwoord } from "@/lib/bonus";
import { stuurPushNaarBeheer } from "@/lib/push";

// ⚡ Bonusvraag voor de speler (migratie 004). GET (elke paar seconden, ook na de finish): staat er nu een open,
// en heeft dit team al geantwoord? POST: het antwoord (meerkeuze als JSON, foto als formulier). Eén poging.
// Zonder migratie of zonder vraag: { bonus: null }, de app doet dan niets.

async function context() {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx?.sessie) return null;
  const { data: route } = await ctx.admin.from("routes").select("*").eq("id", ctx.sessie.route_id).maybeSingle();
  if (!route?.is_active) return null;
  return { ...ctx, sessie: ctx.sessie, route: route as { id: string; uitslag_vrijgegeven?: boolean | null } };
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ bonus: null });
  const { admin, sessie, route } = ctx;
  if (route.uitslag_vrijgegeven || await spelGepauzeerd(admin, route.id)) return NextResponse.json({ bonus: null });
  try {
    await startDueBonus(admin, route.id, !!route.uitslag_vrijgegeven);
    const v = await openBonus(admin, route.id);
    if (!v) return NextResponse.json({ bonus: null });
    const { data: eigen } = await admin.from("bonus_antwoorden").select("*").eq("bonus_id", v.id).eq("session_id", sessie.id).maybeSingle();
    // Nooit het goede antwoord meesturen
    return NextResponse.json({
      bonus: { id: v.id, vraag: v.vraag, soort: v.soort, keuzes: v.keuzes ?? [], punten: v.punten, aantal_teams: v.aantal_teams ?? 1, rest: bonusRestSeconden(v) },
      antwoord: eigen ? { is_correct: (eigen as BonusAntwoord).is_correct, punten: (eigen as BonusAntwoord).punten, foto_status: (eigen as BonusAntwoord).foto_status } : null,
    });
  } catch {
    return NextResponse.json({ bonus: null });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ fout: "Geen spel" }, { status: 403 });
  const { admin, sessie, route } = ctx;
  if (route.uitslag_vrijgegeven) return NextResponse.json({ fout: "De uitslag is al bekend" }, { status: 409 });
  if (await spelGepauzeerd(admin, route.id)) return NextResponse.json({ fout: PAUZE_FOUT, pauze: true }, { status: 409 });

  const isFoto = (request.headers.get("content-type") ?? "").includes("multipart/form-data");
  const form = isFoto ? await request.formData() : null;
  const body = isFoto ? null : await request.json().catch(() => null);
  const bonusId = (form?.get("bonus_id") ?? body?.bonus_id) as string | undefined;

  const v = await openBonus(admin, route.id);
  if (!v || v.id !== bonusId) return NextResponse.json({ fout: "Deze bonusvraag is al gesloten" }, { status: 409 });

  if (v.soort === "meerkeuze") {
    const keuze = Number(body?.keuze);
    if (!Number.isInteger(keuze) || keuze < 0 || keuze >= (v.keuzes?.length ?? 0)) return NextResponse.json({ fout: "Kies een antwoord" }, { status: 400 });
    const goed = keuze === v.goed_index;
    // Eén poging: de unieke sleutel (vraag, team) weigert een tweede antwoord
    const { data: rij, error } = await admin.from("bonus_antwoorden")
      .insert({ bonus_id: v.id, session_id: sessie.id, keuze, is_correct: goed, punten: 0 }).select().single();
    if (error) return NextResponse.json({ fout: error.code === "23505" ? "Jullie hebben al geantwoord" : "Opslaan lukte niet, probeer het opnieuw" }, { status: error.code === "23505" ? 409 : 500 });
    if (!goed) return NextResponse.json({ goed: false, punten: 0 });
    const { plek, punten } = await beloonMeerkeuze(admin, v, rij as BonusAntwoord);
    return NextResponse.json({ goed: true, plek, punten });
  }

  // 📸 Foto: eerst de plek claimen (één poging), dan uploaden; mislukt het uploaden, dan de claim weer weg
  const bestand = form?.get("foto") as File | null;
  if (!bestand || !["image/jpeg", "image/png", "image/webp"].includes(bestand.type)) return NextResponse.json({ fout: "Maak een foto (jpeg, png of webp)" }, { status: 400 });
  const ext = bestand.type === "image/png" ? "png" : bestand.type === "image/webp" ? "webp" : "jpg";
  // Zelfde map als de andere foto's van dit team (zo ruimt Opruimen hem ook op)
  const pad = `${sessie.id}/bonus-${v.id}.${ext}`;
  const { data: rij, error } = await admin.from("bonus_antwoorden")
    .insert({ bonus_id: v.id, session_id: sessie.id, foto_pad: pad, foto_status: "wacht", is_correct: null, punten: 0 }).select().single();
  if (error) return NextResponse.json({ fout: error.code === "23505" ? "Jullie hebben al een foto gestuurd" : "Opslaan lukte niet, probeer het opnieuw" }, { status: error.code === "23505" ? 409 : 500 });
  const { error: uploadFout } = await admin.storage.from("foto-inzendingen")
    .upload(pad, Buffer.from(await bestand.arrayBuffer()), { contentType: bestand.type, upsert: true });
  if (uploadFout) {
    await admin.from("bonus_antwoorden").delete().eq("id", (rij as BonusAntwoord).id);
    return NextResponse.json({ fout: "Foto uploaden lukte niet, probeer het opnieuw" }, { status: 500 });
  }
  const { data: team } = await admin.from("players").select("nickname, login_name").eq("id", ctx.spelerId).maybeSingle();
  await stuurPushNaarBeheer({
    titel: `⚡ Bonusfoto van ${team?.nickname ?? team?.login_name ?? "een team"}`,
    tekst: "Keur hem bij ⚡ Bonusvraag op het dashboard.",
    url: "/admin?bonus=1",
    tag: "bonus",
  }).catch(() => undefined);
  return NextResponse.json({ foto: true });
}
