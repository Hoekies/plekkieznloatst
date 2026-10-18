import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Punten handmatig aanpassen voor één team: bonus (+) of aftrek (−), met een reden.
// De score gaat nooit onder 0. Komt in de tijdlijn en het rapport (migratie 006).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });

  const body = await request.json().catch(() => null);
  const delta = Math.round(Number(body?.delta));
  const reden = typeof body?.reden === "string" ? body.reden.trim().slice(0, 120) : "";
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 10000) {
    return NextResponse.json({ fout: "Vul een aantal punten in (bijv. 20 of -10)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: sessie } = await admin.from("player_sessions").select("id, score").eq("id", params.id).maybeSingle();
  if (!sessie) return NextResponse.json({ fout: "Dit spel bestaat niet (meer)" }, { status: 404 });

  const nieuw = Math.max(0, (sessie.score ?? 0) + delta);
  const werkelijk = nieuw - (sessie.score ?? 0);
  const { error: vastleggen } = await admin.from("score_correcties").insert({ session_id: sessie.id, delta: werkelijk, reden: reden || null });
  if (vastleggen) {
    const migratie = /score_correcties/.test(vastleggen.message);
    return NextResponse.json({ fout: migratie ? "Draai eerst SQL-bestand 006 in Supabase" : vastleggen.message }, { status: 500 });
  }
  await admin.from("player_sessions").update({ score: nieuw }).eq("id", sessie.id);
  return NextResponse.json({ ok: true, score: nieuw, delta: werkelijk });
}
