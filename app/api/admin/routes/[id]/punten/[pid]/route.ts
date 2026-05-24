import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function checkAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.rol === "admin" ? user : null;
}

const TOEGESTANE_VELDEN = [
  "name", "description", "type", "latitude", "longitude",
  "radius_meters", "points", "image_path", "sound_path",
  "qr_unlock_enabled", "qr_secret",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; pid: string } }
) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json();

  // Whitelist: alleen bekende velden doorgeven aan de database
  const update: Record<string, unknown> = {};
  for (const veld of TOEGESTANE_VELDEN) {
    if (veld in body) update[veld] = body[veld];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("route_points")
    .update(update)
    .eq("id", params.pid)
    .eq("route_id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; pid: string } }
) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();

  // Verwijder punt
  const { error } = await admin
    .from("route_points")
    .delete()
    .eq("id", params.pid)
    .eq("route_id", params.id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  // Hernummer resterende punten
  const { data: overig } = await admin
    .from("route_points")
    .select("id")
    .eq("route_id", params.id)
    .order("order_index");
  if (overig) {
    await Promise.all(
      overig.map((p, i) =>
        admin.from("route_points").update({ order_index: i + 1 }).eq("id", p.id)
      )
    );
  }
  return NextResponse.json({ ok: true });
}
