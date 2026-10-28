import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { startBonusNu, herrekenFotoBonus } from "@/lib/bonus-server";
import { telBijScore } from "@/lib/score";
import { bonusOpen, bonusRestSeconden, bonusStartMoment, type BonusAntwoord, type BonusVraag } from "@/lib/bonus";

// ⚡ Bonusvragen van de actieve route (migratie 004).
// GET = lijst met status en antwoorden · POST = nieuwe vraag · PATCH { id, … } = aanpassen (alleen vóór de start),
// { id, actie: "start" } = nu sturen, { id, actie: "keur", antwoord_id, goed } = foto keuren · DELETE { id }
const MIGRATIE = "Draai eerst migratie 004 (bonusvragen) in Supabase";
const uitleg = (bericht: string) => /bonus_/.test(bericht) ? MIGRATIE : bericht;

async function actieveRoute(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.from("routes").select("id, name").eq("is_active", true).maybeSingle();
  return data;
}

// Alleen bekende velden, gecontroleerd; null = ongeldig
function velden(b: Record<string, unknown>): Partial<BonusVraag> | null {
  const vraag = typeof b.vraag === "string" ? b.vraag.trim().slice(0, 300) : "";
  const soort = b.soort === "foto" ? "foto" : b.soort === "meerkeuze" ? "meerkeuze" : null;
  const punten = Number(b.punten), duur = Number(b.duur_seconden);
  const na = b.na_minuten === null || b.na_minuten === "" ? null : Number(b.na_minuten);
  if (!vraag || !soort || !Number.isInteger(punten) || punten < 1 || punten > 1000) return null;
  if (!Number.isInteger(duur) || duur < 30 || duur > 3600) return null;
  if (na !== null && (!Number.isInteger(na) || na < 0 || na > 600)) return null;
  let keuzes: string[] | null = null, goed: number | null = null;
  if (soort === "meerkeuze") {
    keuzes = (Array.isArray(b.keuzes) ? b.keuzes : []).map((k) => String(k ?? "").trim().slice(0, 80)).filter(Boolean).slice(0, 4);
    goed = Number(b.goed_index);
    if (keuzes.length < 2 || !Number.isInteger(goed) || goed < 0 || goed >= keuzes.length) return null;
  }
  return { vraag, soort, keuzes, goed_index: goed, punten, duur_seconden: duur, na_minuten: na };
}

export async function GET() {
  const gebruiker = await haalGebruiker();
  if (!isBeheer(gebruiker)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const route = await actieveRoute(admin);
  if (!route) return NextResponse.json({ vragen: [], route: null });
  const { data: vragen, error } = await admin.from("bonus_vragen").select("*").eq("route_id", route.id).order("created_at");
  if (error) return NextResponse.json({ fout: uitleg(error.message) }, { status: 500 });
  const ids = (vragen ?? []).map((v) => v.id);
  const [{ data: antwoorden }, { data: spellen }] = await Promise.all([
    ids.length ? admin.from("bonus_antwoorden").select("*").in("bonus_id", ids).order("beantwoord_op") : Promise.resolve({ data: [] as BonusAntwoord[] }),
    admin.from("player_sessions").select("id, started_at, player_id, players(nickname, login_name, icon)").eq("route_id", route.id).in("status", ["actief", "voltooid"]),
  ]);
  const teams = new Map((spellen ?? []).map((s) => {
    const p = s.players as unknown as { nickname: string | null; login_name: string; icon: string | null } | null;
    return [s.id, { naam: p?.nickname ?? p?.login_name ?? "Team", icon: p?.icon ?? null }];
  }));
  const eersteStart = (spellen ?? []).map((s) => s.started_at).filter((t): t is string => !!t).sort()[0] ?? null;
  // Foto's: tijdelijke links (de opslag is afgeschermd)
  const metFoto = ((antwoorden ?? []) as BonusAntwoord[]).filter((a) => a.foto_pad);
  const links = new Map<string, string>();
  await Promise.all(metFoto.map(async (a) => {
    const { data } = await admin.storage.from("foto-inzendingen").createSignedUrl(a.foto_pad!, 3600);
    if (data?.signedUrl) links.set(a.id, data.signedUrl);
  }));
  return NextResponse.json({
    route,
    teams_nu: (spellen ?? []).length,
    vragen: ((vragen ?? []) as BonusVraag[]).map((v) => ({
      ...v,
      open: bonusOpen(v),
      rest: bonusRestSeconden(v),
      start_om: v.gestart_op ? null : bonusStartMoment(v, eersteStart),
      antwoorden: ((antwoorden ?? []) as BonusAntwoord[]).filter((a) => a.bonus_id === v.id)
        .map((a) => ({ ...a, team: teams.get(a.session_id) ?? { naam: "Team", icon: null }, foto_url: links.get(a.id) ?? null })),
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const route = await actieveRoute(admin);
  if (!route) return NextResponse.json({ fout: "Er is geen actieve route" }, { status: 400 });
  const v = velden(await request.json().catch(() => ({})));
  if (!v) return NextResponse.json({ fout: "Vul de vraag, de punten, de tijd en (bij meerkeuze) minstens twee keuzes met het goede antwoord in" }, { status: 400 });
  const { data, error } = await admin.from("bonus_vragen").insert({ ...v, route_id: route.id }).select().single();
  if (error) return NextResponse.json({ fout: uitleg(error.message) }, { status: 500 });
  return NextResponse.json({ vraag: data });
}

export async function PATCH(request: NextRequest) {
  const gebruiker = await haalGebruiker();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  // Foto's keuren mag ook een helper; de rest alleen de beheerder
  if (body.actie === "keur" ? !isBeheer(gebruiker) : !isAdmin(gebruiker)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data: v, error } = await admin.from("bonus_vragen").select("*").eq("id", String(body.id ?? "")).maybeSingle();
  if (error) return NextResponse.json({ fout: uitleg(error.message) }, { status: 500 });
  if (!v) return NextResponse.json({ fout: "Bonusvraag niet gevonden" }, { status: 404 });
  const vraag = v as BonusVraag;

  if (body.actie === "start") {
    const ok = await startBonusNu(admin, vraag.id, vraag.route_id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ fout: "Deze bonusvraag is al gestart" }, { status: 409 });
  }
  if (body.actie === "keur") {
    const goed = body.goed === true;
    const { error: keurFout } = await admin.from("bonus_antwoorden")
      .update({ foto_status: goed ? "goedgekeurd" : "afgekeurd", is_correct: goed })
      .eq("id", String(body.antwoord_id ?? "")).eq("bonus_id", vraag.id);
    if (keurFout) return NextResponse.json({ fout: keurFout.message }, { status: 500 });
    await herrekenFotoBonus(admin, vraag);
    return NextResponse.json({ ok: true });
  }
  if (vraag.gestart_op) return NextResponse.json({ fout: "Een gestarte bonusvraag kun je niet meer aanpassen" }, { status: 409 });
  const nieuw = velden(body);
  if (!nieuw) return NextResponse.json({ fout: "Vul de vraag, de punten, de tijd en (bij meerkeuze) minstens twee keuzes met het goede antwoord in" }, { status: 400 });
  const { error: opslaanFout } = await admin.from("bonus_vragen").update(nieuw).eq("id", vraag.id).is("gestart_op", null);
  if (opslaanFout) return NextResponse.json({ fout: uitleg(opslaanFout.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { id?: string };
  const admin = createAdminClient();
  const { data: v } = await admin.from("bonus_vragen").select("*").eq("id", String(body.id ?? "")).maybeSingle();
  if (!v) return NextResponse.json({ fout: "Bonusvraag niet gevonden" }, { status: 404 });
  // Al gegeven punten gaan er weer af, zodat de stand klopt
  const { data: antwoorden } = await admin.from("bonus_antwoorden").select("session_id, punten").eq("bonus_id", v.id).gt("punten", 0);
  for (const a of antwoorden ?? []) await telBijScore(admin, a.session_id, -a.punten);
  const { error } = await admin.from("bonus_vragen").delete().eq("id", v.id);
  if (error) return NextResponse.json({ fout: uitleg(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
