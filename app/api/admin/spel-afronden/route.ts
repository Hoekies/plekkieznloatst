import { NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { laatItemsVervallen } from "@/lib/items-vervallen";
import { itemsNaFinishVan } from "@/lib/item-sessie";
import { testRol } from "@/lib/testteam";

// 🏁 Afronden → Iedereen stoppen: alle teams die nog spelen zijn nu gefinisht, net als bij de eindtijd. Hun stand
// telt dus mee in de uitslag en het rapport (anders dan "Spel stoppen" bij één team: dat laat het spel vervallen,
// zodat het team opnieuw kan beginnen). Een testteam blijft buiten beschouwing.
export async function POST() {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("*").eq("is_active", true).maybeSingle();
  if (!route) return NextResponse.json({ fout: "Er is geen actieve route" }, { status: 400 });

  const { data: rijen, error } = await admin.from("player_sessions").select("id, players!inner(*)").eq("route_id", route.id).eq("status", "actief");
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  const ids = ((rijen ?? []) as unknown as { id: string; players: Parameters<typeof testRol>[0] }[])
    .filter((r) => !testRol(r.players)).map((r) => r.id);
  if (!ids.length) return NextResponse.json({ ok: true, gestopt: 0 });

  const { data: gestopt, error: fout } = await admin.from("player_sessions")
    .update({ status: "voltooid", finished_at: new Date().toISOString() })
    .in("id", ids).eq("status", "actief").select("id");
  if (fout) return NextResponse.json({ fout: fout.message }, { status: 500 });
  const klaar = (gestopt ?? []).map((s) => s.id);
  if (klaar.length) {
    await laatItemsVervallen(admin, klaar, { naFinishTypes: itemsNaFinishVan(route) });
    // Openstaande hulpmeldingen van deze spellen zijn niet meer relevant
    await admin.from("hulpverzoeken").update({ status: "genegeerd", afgehandeld_at: new Date().toISOString() }).in("session_id", klaar).eq("status", "open");
  }
  return NextResponse.json({ ok: true, gestopt: klaar.length });
}
