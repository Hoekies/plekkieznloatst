import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { zetScore } from "@/lib/score";

// Punten handmatig aanpassen voor één team: bonus (+) of aftrek (−), met een reden.
// De score mag onder 0 (migratie 021). Komt in de tijdlijn en het rapport (migratie 006); het team krijgt
// er een melding van.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (!isAdmin(user)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });

  const body = await request.json().catch(() => null);
  const delta = Math.round(Number(body?.delta));
  const reden = typeof body?.reden === "string" ? body.reden.trim().slice(0, 120) : "";
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 10000) {
    return NextResponse.json({ fout: "Vul een aantal punten in (bijv. 20 of -10)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: sessie } = await admin.from("player_sessions").select("id, score, player_id").eq("id", params.id).maybeSingle();
  if (!sessie) return NextResponse.json({ fout: "Dit spel bestaat niet (meer)" }, { status: 404 });

  // Aftrek mag het team in de min brengen (migratie 021)
  const { error: vastleggen } = await admin.from("score_correcties").insert({ session_id: sessie.id, delta, reden: reden || null });
  if (vastleggen) {
    const migratie = /score_correcties/.test(vastleggen.message);
    return NextResponse.json({ fout: migratie ? "Draai eerst SQL-bestand 006 in Supabase" : vastleggen.message }, { status: 500 });
  }
  const nieuw = await zetScore(admin, sessie.id, (sessie.score ?? 0) + delta);
  // Het team ziet meteen een melding in beeld (zelfde weg als 📢 Bericht sturen, alleen aan dit team).
  // Vaste vorm "+10 punten · reden": de spelersapp herkent hem en toont de punten groot (zie PUNTEN_BERICHT)
  const tekst = `${delta > 0 ? "+" : ""}${delta} punten${reden ? ` · ${reden}` : ""}`;
  await admin.from("broadcasts").insert({ bericht: tekst.slice(0, 150), player_id: sessie.player_id });
  return NextResponse.json({ ok: true, score: nieuw, delta });
}
