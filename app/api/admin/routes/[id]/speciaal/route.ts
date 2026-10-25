import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { opDeWeg, speelplaatsen } from "@/lib/op-de-weg";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("special_items")
    .select("*")
    .eq("route_id", params.id)
    .eq("is_startitem", false)
    .order("created_at");
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json();
  const admin = createAdminClient();
  // Item op de weg leggen (niet in een tuin of tussen huizen)
  const plek = await opDeWeg({ lat: body.latitude, lng: body.longitude });

  const { data, error } = await admin
    .from("special_items")
    .insert({
      route_id: params.id,
      type: body.type ?? "ster",
      name: body.name ?? body.type ?? "Speciaal item",
      latitude: plek.lat,
      longitude: plek.lng,
      radius_meters: body.radius_meters ?? 15,
      points_effect: body.points_effect ?? 0,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// 🛣️ Alle items van de route op de weg leggen (voor items die eerder naast de weg zijn gezet)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (body?.opDeWeg !== true) return NextResponse.json({ fout: "Onbekende actie" }, { status: 400 });
  const admin = createAdminClient();
  const { data: items, error } = await admin.from("special_items").select("id, latitude, longitude").eq("route_id", params.id).eq("is_startitem", false);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  let verplaatst = 0;
  // 🛝 Speelplaatsen en schoolpleinen één keer ophalen: items die daarop liggen blijven liggen
  const vlakken = await speelplaatsen((items ?? []).map((it) => ({ lat: it.latitude, lng: it.longitude })));
  // Twee tegelijk, om de gratis dienst niet te overvragen
  for (let i = 0; i < (items ?? []).length; i += 2) {
    await Promise.all(items!.slice(i, i + 2).map(async (it) => {
      const plek = await opDeWeg({ lat: it.latitude, lng: it.longitude }, 60, vlakken);
      if (plek.lat === it.latitude && plek.lng === it.longitude) return;
      await admin.from("special_items").update({ latitude: plek.lat, longitude: plek.lng }).eq("id", it.id);
      verplaatst++;
    }));
  }
  const { data: alle } = await admin.from("special_items").select("*").eq("route_id", params.id).eq("is_startitem", false).order("created_at");
  return NextResponse.json({ verplaatst, items: alle ?? [] });
}
