import { NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { maakStand, routeVanSpel } from "@/lib/stand";

// Tussenstand: elke zoveel minuten (vanaf de eerste start) een paar seconden zichtbaar, of direct door de spelleider
export async function GET() {
  const ctx = await haalSpelerSessie();
  if (!ctx) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { admin, spelerId, sessie } = ctx;

  const routeId = await routeVanSpel(admin, sessie);
  if (!routeId) return NextResponse.json({ zichtbaar: false });

  const { data: route } = await admin
    .from("routes")
    .select("tussenstand_interval_minuten, tussenstand_duur_seconden, tussenstand_trigger_at")
    .eq("id", routeId)
    .single();
  if (!route) return NextResponse.json({ zichtbaar: false });

  // Het moment dat het eerste team startte: daar telt het interval vanaf
  const { data: eerste } = await admin.from("player_sessions").select("started_at")
    .eq("route_id", routeId).in("status", ["actief", "voltooid"]).order("started_at", { ascending: true }).limit(1).maybeSingle();
  const gestartOp = eerste?.started_at ?? null;
  const nu = Date.now();

  let resterendPeriodiek = 0;
  if (gestartOp && route.tussenstand_interval_minuten > 0) {
    const verstreken = (nu - new Date(gestartOp).getTime()) / 1000;
    const periode = route.tussenstand_interval_minuten * 60;
    // De nulde (start)flits overslaan: anders flitst hij meteen bij 0:00 met alleen nullen
    if (Math.floor(verstreken / periode) >= 1 && verstreken % periode < route.tussenstand_duur_seconden) {
      resterendPeriodiek = route.tussenstand_duur_seconden - (verstreken % periode);
    }
  }
  let resterendHandmatig = 0;
  if (route.tussenstand_trigger_at) {
    const sinds = (nu - new Date(route.tussenstand_trigger_at).getTime()) / 1000;
    if (sinds >= 0 && sinds < route.tussenstand_duur_seconden) resterendHandmatig = route.tussenstand_duur_seconden - sinds;
  }
  if (resterendPeriodiek <= 0 && resterendHandmatig <= 0) return NextResponse.json({ zichtbaar: false });

  const stand = await maakStand(admin, routeId, spelerId, false);
  const resterendeSeconden = Math.max(Math.ceil(Math.max(resterendPeriodiek, resterendHandmatig)), 1);
  return NextResponse.json({ zichtbaar: true, resterende_seconden: resterendeSeconden, tussenstand: stand });
}
