import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Body: { volgorde: ["uuid1", "uuid2", ...] }
// De lijst moet precies alle punten van de route bevatten, elk één keer. Elke stap wordt gecontroleerd;
// mislukt er een, dan een fout (de editor zet dan de oude volgorde terug in beeld).
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (!isAdmin(user)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const volgorde: string[] = body?.volgorde;
  if (!Array.isArray(volgorde)) return NextResponse.json({ fout: "Ongeldig verzoek" }, { status: 400 });

  const admin = createAdminClient();
  const { data: punten, error: leesFout } = await admin.from("route_points").select("id, order_index").eq("route_id", params.id);
  if (leesFout) return NextResponse.json({ fout: "De punten konden niet worden gelezen" }, { status: 500 });
  const ids = new Set((punten ?? []).map((p) => p.id));
  if (new Set(volgorde).size !== volgorde.length || volgorde.length !== ids.size || volgorde.some((id) => !ids.has(id))) {
    return NextResponse.json({ fout: "De volgorde klopt niet met de punten van de route (ververs de pagina)" }, { status: 400 });
  }

  const zet = async (waarde: (i: number) => number) => {
    const uit = await Promise.all(volgorde.map((id, i) =>
      admin.from("route_points").update({ order_index: waarde(i) }).eq("id", id).eq("route_id", params.id)));
    const fout = uit.find((r) => r.error)?.error;
    if (fout) throw new Error(fout.message);
  };
  try {
    // Stap 1: tijdelijke hoge waarden om UNIQUE (route_id, order_index) conflicten te vermijden
    await zet((i) => 10000 + i);
    // Stap 2: echte waarden zetten
    await zet((i) => i + 1);
  } catch (e) {
    // Oude nummers terug (zo goed als het gaat), zodat de route niet op tijdelijke nummers blijft staan
    const oud = new Map((punten ?? []).map((p) => [p.id, p.order_index as number]));
    await zet((i) => 20000 + i).catch(() => undefined);
    await Promise.all(volgorde.map((id) => admin.from("route_points").update({ order_index: oud.get(id) }).eq("id", id)));
    return NextResponse.json({ fout: `Volgorde opslaan lukte niet: ${(e as Error).message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
