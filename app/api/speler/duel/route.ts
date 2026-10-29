import { NextRequest, NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { mijnDuel, beantwoordDuel } from "@/lib/duel";
import { DUEL_VRAGEN, DUEL_SECONDEN } from "@/lib/duel-vragen";
import { testRol, testBotAntwoord } from "@/lib/testteam";

// ⚔️ Duel voor de speler (migratie 006). GET: het open (of net afgelopen) duel van dit team. POST { duel_id, keuze }.
export async function GET() {
  const ctx = await haalSpelerSessie();
  if (!ctx?.sessie) return NextResponse.json({ duel: null });
  try {
    let d = await mijnDuel(ctx.admin, ctx.sessie.id);
    if (!d) return NextResponse.json({ duel: null });
    const ander = d.sessie_a === ctx.sessie.id ? d.sessie_b : d.sessie_a;
    const { data: s } = await ctx.admin.from("player_sessions").select("players!inner(*)").eq("id", ander).maybeSingle();
    const p = s?.players as unknown as { nickname: string | null; login_name: string; icon: string | null } | undefined;
    // 🧪 Tegen de testtegenstander: die antwoordt zelf
    if (testRol(p) === "tegenstander" && await testBotAntwoord(ctx.admin, d, ander)) d = (await mijnDuel(ctx.admin, ctx.sessie.id)) ?? d;
    const v = DUEL_VRAGEN[d.vraag_nr];
    const mijn = d.sessie_a === ctx.sessie.id ? d.antwoord_a : d.antwoord_b;
    const rest = Math.max(0, Math.ceil((Date.parse(d.gestart_op) + DUEL_SECONDEN * 1000 - Date.now()) / 1000));
    return NextResponse.json({
      duel: {
        id: d.id, vraag: v?.vraag ?? "", keuzes: v?.keuzes ?? [], punten: d.punten, rest,
        tegenstander: { naam: p?.nickname ?? p?.login_name ?? "een ander team", icon: p?.icon ?? null },
        mijn_antwoord: mijn, afgerond: !!d.afgerond_op,
        uitslag: d.winnaar ? (d.winnaar === ctx.sessie.id ? "gewonnen" : "verloren") : d.afgerond_op ? "niemand" : null,
        buit: d.buit,
      },
    });
  } catch {
    return NextResponse.json({ duel: null });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await haalSpelerSessie();
  if (!ctx?.sessie) return NextResponse.json({ fout: "Geen spel" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { duel_id?: string; keuze?: number };
  const d = await mijnDuel(ctx.admin, ctx.sessie.id);
  if (!d || d.id !== body.duel_id) return NextResponse.json({ fout: "Dit duel is al voorbij" }, { status: 409 });
  const keuze = Number(body.keuze);
  if (!Number.isInteger(keuze) || keuze < 0 || keuze > 3) return NextResponse.json({ fout: "Kies een antwoord" }, { status: 400 });
  const uit = await beantwoordDuel(ctx.admin, d, ctx.sessie.id, keuze);
  return uit.ok ? NextResponse.json(uit) : NextResponse.json({ fout: uit.fout }, { status: 409 });
}
