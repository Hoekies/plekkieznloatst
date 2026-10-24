import { NextResponse } from "next/server";
import { startitemsVan } from "@/lib/startitems";
import { haalSpelerSessie } from "@/lib/speler-sessie";

// Startitems: het team krijgt ze pas nadat het 100 meter heeft gelopen (de app vraagt ze dan aan).
// Eén keer per sessie: zijn ze al gegeven, dan komt er niets meer bij.
export async function POST() {
  const ctx = await haalSpelerSessie();
  if (!ctx) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 403 });
  const { admin, sessie } = ctx;
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const { count: al } = await admin
    .from("special_items").select("id", { count: "exact", head: true })
    .eq("claimed_by_session_id", sessie.id).eq("is_startitem", true);
  if (al) return NextResponse.json({ items: [] });

  const { data: route } = await admin.from("routes").select("*").eq("id", sessie.route_id).maybeSingle();
  if (!route) return NextResponse.json({ items: [] });
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
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ items: items ?? [] });
}
