import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function checkAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.rol === "admin" ? user : null;
}

const TOEGESTANE_VELDEN = ["name", "type", "latitude", "longitude", "radius_meters", "points_effect"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; sid: string } }
) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json();
  const update: Record<string, unknown> = {};
  for (const veld of TOEGESTANE_VELDEN) {
    if (veld in body) update[veld] = body[veld];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("special_items")
    .update(update)
    .eq("id", params.sid)
    .eq("route_id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; sid: string } }
) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("special_items")
    .delete()
    .eq("id", params.sid)
    .eq("route_id", params.id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
