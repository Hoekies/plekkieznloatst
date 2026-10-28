import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { laatItemsVervallen } from "@/lib/items-vervallen";
import { itemsNaFinishVan } from "@/lib/item-sessie";
import { telBijScore } from "@/lib/score";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await haalGebruiker();
  if (!isBeheer(user)) {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const { status, punten, opmerking } = await request.json();
  if (status !== "goedgekeurd" && status !== "afgekeurd") {
    return NextResponse.json({ fout: "Ongeldige status" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Haal inzending op
  const { data: inzending } = await admin
    .from("foto_inzendingen")
    .select("id, session_id, route_point_id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!inzending) return NextResponse.json({ fout: "Inzending niet gevonden" }, { status: 404 });
  if (inzending.status !== "wacht") return NextResponse.json({ fout: "Al beoordeeld" }, { status: 409 });

  const puntentoekenend = status === "goedgekeurd" ? Math.round(Number(punten) || 0) : 0;
  if (Math.abs(puntentoekenend) > 10000) return NextResponse.json({ fout: "Ongeldig aantal punten" }, { status: 400 });

  // Keuren: alleen als de foto nog wacht. Twee keurders tegelijk geven zo nooit twee keer punten.
  const { data: gekeurd, error: keurFout } = await admin.from("foto_inzendingen").update({
    status,
    punten_toegekend: puntentoekenend,
    beoordeeld_op: new Date().toISOString(),
  }).eq("id", params.id).eq("status", "wacht").select("id");
  if (keurFout) return NextResponse.json({ fout: "Keuren lukte niet, probeer het opnieuw" }, { status: 500 });
  if (!gekeurd?.length) return NextResponse.json({ fout: "Al beoordeeld" }, { status: 409 });
  // Mislukt hierna de score, dan de foto weer laten wachten zodat opnieuw keuren kan
  const terugNaarWacht = () => admin.from("foto_inzendingen").update({ status: "wacht", punten_toegekend: null, beoordeeld_op: null }).eq("id", params.id);

  // 💬 Opmerking bij het keuren: komt meteen als bericht bij het team (zoals een teambericht)
  const tekst = typeof opmerking === "string" ? opmerking.trim().slice(0, 110) : "";
  if (tekst) {
    const [{ data: sessie }, { data: punt }] = await Promise.all([
      admin.from("player_sessions").select("player_id").eq("id", inzending.session_id).maybeSingle(),
      admin.from("route_points").select("name").eq("id", inzending.route_point_id).maybeSingle(),
    ]);
    if (sessie?.player_id) {
      await admin.from("broadcasts").insert({
        bericht: `📸 ${status === "goedgekeurd" ? "Foto goedgekeurd" : "Foto afgekeurd"}${punt?.name ? ` (${punt.name})` : ""}: ${tekst}`.slice(0, 150),
        player_id: sessie.player_id,
      });
    }
  }

  // Voortgang bijwerken. Het punt is normaal al afgerond bij het insturen (het team speelde
  // meteen door); alleen bij oudere inzendingen zetten we answered_at hier alsnog.
  const { data: rij } = await admin
    .from("player_point_progress")
    .select("id, answered_at")
    .eq("session_id", inzending.session_id)
    .eq("route_point_id", inzending.route_point_id)
    .maybeSingle();
  if (rij) {
    await admin.from("player_point_progress").update({
      is_correct: status === "goedgekeurd",
      points_awarded: puntentoekenend,
      ...(rij.answered_at ? {} : { answered_at: new Date().toISOString() }),
    }).eq("id", rij.id);
  }

  // Score bijwerken, in één stap in de database (ook minpunten, net als bij gewone antwoorden)
  if (puntentoekenend !== 0) {
    try {
      await telBijScore(admin, inzending.session_id, puntentoekenend);
    } catch {
      await terugNaarWacht();
      if (rij) await admin.from("player_point_progress").update({ is_correct: null, points_awarded: 0 }).eq("id", rij.id);
      return NextResponse.json({ fout: "Punten bijschrijven lukte niet, probeer het opnieuw" }, { status: 500 });
    }
  }

  // Controleer of sessie nu klaar is (alle punten beantwoord)
  const { data: allePunten } = await admin
    .from("player_sessions")
    .select("route_id")
    .eq("id", inzending.session_id)
    .maybeSingle();

  if (allePunten) {
    const [{ count: totaal }, { count: beantwoord }] = await Promise.all([
      admin.from("route_points").select("*", { count: "exact", head: true }).eq("route_id", allePunten.route_id),
      admin.from("player_point_progress").select("*", { count: "exact", head: true })
        .eq("session_id", inzending.session_id).not("answered_at", "is", null),
    ]);
    if (totaal && beantwoord && beantwoord >= totaal) {
      // Alleen een sessie die nog loopt afronden — anders zou de finishtijd verschuiven
      await admin.from("player_sessions").update({
        status: "voltooid",
        finished_at: new Date().toISOString(),
      }).eq("id", inzending.session_id).eq("status", "actief");
      const { data: fotoRoute } = await admin.from("routes").select("*").eq("id", allePunten.route_id).maybeSingle();
      await laatItemsVervallen(admin, [inzending.session_id], { naFinishTypes: itemsNaFinishVan(fotoRoute) });
    }
  }

  return NextResponse.json({ ok: true });
}
