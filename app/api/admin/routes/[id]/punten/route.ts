import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { voegPuntToeAanLopendeSpellen } from "@/lib/route-sessies";

async function checkAdmin() {
  const user = await haalGebruiker();
  return user?.app_metadata?.rol === "admin" ? user : null;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("route_points")
    .select("*")
    .eq("route_id", params.id)
    .order("order_index");
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json();
  const admin = createAdminClient();

  // Volgende order_index: één hoger dan de hoogste. Niet "aantal + 1": na het verwijderen van
  // een punt zit er een gat in de nummering en is dat nummer al bezet (dubbel = fout bij opslaan).
  const [{ count }, { data: hoogste }] = await Promise.all([
    admin.from("route_points").select("*", { count: "exact", head: true }).eq("route_id", params.id),
    admin.from("route_points").select("order_index").eq("route_id", params.id)
      .order("order_index", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const { data, error } = await admin
    .from("route_points")
    .insert({
      route_id: params.id,
      order_index: (hoogste?.order_index ?? 0) + 1,
      type: body.type ?? "vraagpunt",
      name: body.name ?? `Punt ${(count ?? 0) + 1}`,
      latitude: body.latitude,
      longitude: body.longitude,
      radius_meters: body.radius_meters ?? 10,
      points: body.points ?? 0,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  // Loopt er een spel op deze route? Dan krijgt elk team het nieuwe punt vóór de finish
  await voegPuntToeAanLopendeSpellen(admin, params.id, data.id);
  return NextResponse.json(data, { status: 201 });
}
