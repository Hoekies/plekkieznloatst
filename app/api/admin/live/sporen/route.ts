import { NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haversine } from "@/lib/geo";

// Het spoor van de laatste minuten per speler, voor de vervagende lijn op de live kaart
const MINUTEN = 10;

export async function GET() {
  const user = await haalGebruiker();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("id").eq("is_active", true).maybeSingle();
  if (!route) return NextResponse.json({ sporen: {} });

  const { data: sessies } = await admin.from("player_sessions").select("id, player_id").eq("route_id", route.id).eq("status", "actief");
  if (!sessies?.length) return NextResponse.json({ sporen: {} });

  const vanaf = new Date(Date.now() - MINUTEN * 60 * 1000).toISOString();
  const { data: locaties } = await admin
    .from("location_updates")
    .select("session_id, latitude, longitude, accuracy_meters, created_at")
    .in("session_id", sessies.map((s) => s.id))
    .gte("created_at", vanaf)
    .order("created_at")
    .limit(5000);

  const spelerVan = new Map(sessies.map((s) => [s.id, s.player_id]));
  const sporen: Record<string, [number, number][]> = {};
  for (const l of locaties ?? []) {
    // GPS-ruis eruit, zoals bij de gelopen route: onnauwkeurige metingen en stapjes onder 5 m overslaan
    if ((l.accuracy_meters ?? 0) > 40) continue;
    const id = spelerVan.get(l.session_id);
    if (!id) continue;
    const spoor = (sporen[id] ??= []);
    const vorige = spoor[spoor.length - 1];
    if (!vorige || haversine(vorige[0], vorige[1], l.latitude, l.longitude) >= 5) spoor.push([l.latitude, l.longitude]);
  }
  return NextResponse.json({ sporen });
}
