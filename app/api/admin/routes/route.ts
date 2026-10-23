import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function checkAdmin() {
  const user = await haalGebruiker();
  if (!user || user.app_metadata?.rol !== "admin") return null;
  return user;
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("routes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  // Startpunt (eerste punt) per route: daarmee toont het overzicht in welke plaats de route ligt
  const ids = (data ?? []).map((r) => r.id);
  const { data: punten } = ids.length
    ? await admin.from("route_points").select("route_id, latitude, longitude, order_index").in("route_id", ids).order("order_index")
    : { data: [] };
  const start = new Map<string, { lat: number; lng: number }>();
  for (const p of punten ?? []) if (!start.has(p.route_id)) start.set(p.route_id, { lat: p.latitude, lng: p.longitude });
  return NextResponse.json((data ?? []).map((r) => ({ ...r, start: start.get(r.id) ?? null })));
}

export async function POST(request: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json();
  const { name } = body;
  if (!name?.trim()) return NextResponse.json({ fout: "Naam is verplicht" }, { status: 400 });

  // Nieuwe route: respawn van items standaard aan (in te stellen bij ⚙️ Instellingen → Items)
  const nieuweRoute: Record<string, unknown> = { name: name.trim(), status: "concept", is_active: false, item_respawn: true };
  if (body.modus === "sequentieel" || body.modus === "verspreid") nieuweRoute.modus = body.modus;
  if (typeof body.verwacht_aantal_teams === "number" && body.verwacht_aantal_teams >= 2) nieuweRoute.verwacht_aantal_teams = body.verwacht_aantal_teams;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("routes")
    .insert(nieuweRoute)
    .select()
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
