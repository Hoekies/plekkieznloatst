import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function checkAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  // Bepaal de volgende order_index
  const { count } = await admin
    .from("route_points")
    .select("*", { count: "exact", head: true })
    .eq("route_id", params.id);

  const { data, error } = await admin
    .from("route_points")
    .insert({
      route_id: params.id,
      order_index: (count ?? 0) + 1,
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
  return NextResponse.json(data, { status: 201 });
}
