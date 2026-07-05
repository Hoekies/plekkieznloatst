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
    .from("special_items")
    .select("*")
    .eq("route_id", params.id)
    .order("created_at");
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("special_items")
    .insert({
      route_id: params.id,
      type: body.type ?? "ster",
      name: body.name ?? body.type ?? "Speciaal item",
      latitude: body.latitude,
      longitude: body.longitude,
      radius_meters: body.radius_meters ?? 15,
      points_effect: body.points_effect ?? 0,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
