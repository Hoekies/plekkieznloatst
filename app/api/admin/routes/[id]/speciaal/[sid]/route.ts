import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { opDeWeg } from "@/lib/op-de-weg";

const TOEGESTANE_VELDEN = ["name", "type", "latitude", "longitude", "radius_meters", "points_effect"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; sid: string } }
) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json();
  const update: Record<string, unknown> = {};
  for (const veld of TOEGESTANE_VELDEN) {
    if (veld in body) update[veld] = body[veld];
  }
  // Verplaatst: op de weg leggen, tenzij "vrij" (dan precies waar het is neergezet)
  if (typeof body.latitude === "number" && typeof body.longitude === "number") {
    const plek = body.vrij === true ? { lat: body.latitude, lng: body.longitude } : await opDeWeg({ lat: body.latitude, lng: body.longitude });
    update.latitude = plek.lat; update.longitude = plek.lng;
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
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("special_items")
    .delete()
    .eq("id", params.sid)
    .eq("route_id", params.id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
