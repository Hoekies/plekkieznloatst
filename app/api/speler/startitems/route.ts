import { NextResponse } from "next/server";
import { startitemsVan } from "@/lib/startitems";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { spelGepauzeerd, PAUZE_FOUT } from "@/lib/eindtijd";

// Startitems: het team krijgt ze pas nadat het 100 meter heeft gelopen (de app vraagt ze dan aan).
// Eén keer per sessie: zijn ze al gegeven, dan komt er niets meer bij. Met migratie 003 wordt dat in de
// database vastgelegd (startitems_op), zodat twee aanvragen tegelijk geen twee sets geven.
export async function POST() {
  const ctx = await haalSpelerSessie();
  if (!ctx) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 403 });
  const { admin, sessie } = ctx;
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });
  if (await spelGepauzeerd(admin, sessie.route_id)) return NextResponse.json({ fout: PAUZE_FOUT, pauze: true }, { status: 409 });
  // Pas na het eerste stuk lopen (de app meldt de gelopen meters; een beetje speling voor GPS)
  const gelopen = (sessie as { afstand_m?: number | null }).afstand_m;
  if (typeof gelopen === "number" && gelopen < 80) return NextResponse.json({ fout: "Eerst een stukje lopen", items: [] }, { status: 409 });

  const { count: al } = await admin
    .from("special_items").select("id", { count: "exact", head: true })
    .eq("claimed_by_session_id", sessie.id).eq("is_startitem", true);
  if (al) return NextResponse.json({ items: [] });

  // Eén keer claimen: alleen het verzoek dat startitems_op zelf invult, deelt uit
  const { data: geclaimd, error: claimFout } = await admin.from("player_sessions")
    .update({ startitems_op: new Date().toISOString() }).eq("id", sessie.id).is("startitems_op", null).select("id");
  const zonderKolom = !!claimFout && /startitems_op/.test(claimFout.message);
  if (claimFout && !zonderKolom) return NextResponse.json({ fout: "Even geen verbinding met de database" }, { status: 503 });
  if (!zonderKolom && !geclaimd?.length) return NextResponse.json({ items: [] });
  const geefTerug = () => zonderKolom ? Promise.resolve() :
    admin.from("player_sessions").update({ startitems_op: null }).eq("id", sessie.id).then(() => undefined, () => undefined);

  const { data: route } = await admin.from("routes").select("*").eq("id", sessie.route_id).maybeSingle();
  if (!route) { await geefTerug(); return NextResponse.json({ items: [] }); }
  const { data: eerstePunt } = await admin
    .from("route_points").select("latitude, longitude").eq("route_id", route.id).order("order_index").limit(1).maybeSingle();

  // Ze staan nooit op de kaart en worden bij "Reset spel" opgeruimd
  const rijen = Object.entries(startitemsVan(route)).flatMap(([type, aantal]) =>
    Array.from({ length: aantal }, () => ({
      route_id: route.id,
      type,
      name: `Start${type}`,
      latitude: eerstePunt?.latitude ?? 0,
      longitude: eerstePunt?.longitude ?? 0,
      points_effect: 0,
      claimed: true,
      claimed_by_session_id: sessie.id,
      claimed_at: new Date().toISOString(),
      is_startitem: true,
    })));
  if (!rijen.length) return NextResponse.json({ items: [] });
  const { data: items, error } = await admin.from("special_items").insert(rijen).select();
  if (error) { await geefTerug(); return NextResponse.json({ fout: error.message }, { status: 500 }); }
  return NextResponse.json({ items: items ?? [] });
}
