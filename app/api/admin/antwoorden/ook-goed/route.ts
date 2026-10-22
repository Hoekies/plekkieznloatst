import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { keurAntwoordGoed } from "@/lib/antwoord-keuren";

// Achteraf goed rekenen voor alle teams tegelijk (📊 Per vraag): een fout antwoord dat toch goed is,
// of de hele vraag (bijv. als de vraag zelf niet klopte). POST { ids: voortgang-ids, ook_goed_tekst? }
// ook_goed_tekst (open vraag): dat antwoord telt voortaan ook goed, ook voor teams die nog moeten komen.
export async function POST(request: NextRequest) {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 500) : [];
  if (!ids.length) return NextResponse.json({ fout: "Geen antwoorden gekozen" }, { status: 400 });

  const admin = createAdminClient();
  let gelukt = 0;
  for (const id of ids) {
    const r = await keurAntwoordGoed(admin, id);
    if ("ok" in r) gelukt++;
  }

  const tekst = typeof body?.ook_goed_tekst === "string" ? body.ook_goed_tekst.trim().slice(0, 200) : "";
  if (tekst) {
    const { data: rij } = await admin.from("player_point_progress").select("route_point_id").eq("id", ids[0]).maybeSingle();
    const { data: vraag } = rij ? await admin.from("questions").select("id, type, correct_text_answers, numeric_answer").eq("route_point_id", rij.route_point_id).maybeSingle() : { data: null };
    if (vraag?.type === "open" && vraag.numeric_answer == null) {
      const lijst: string[] = vraag.correct_text_answers ?? [];
      if (!lijst.some((a) => a.trim().toLowerCase() === tekst.toLowerCase())) {
        await admin.from("questions").update({ correct_text_answers: [...lijst, tekst] }).eq("id", vraag.id);
      }
    }
  }
  return NextResponse.json({ ok: true, gelukt });
}
