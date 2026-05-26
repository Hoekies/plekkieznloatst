import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function checkAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.rol === "admin" ? user : null;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("routes")
    .select("*, route_points(*)")
    .eq("id", params.id)
    .order("order_index", { referencedTable: "route_points" })
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json();
  // Whitelist: alleen name en status mogen via PATCH worden bijgewerkt.
  // is_active loopt uitsluitend via /activeren.
  const toegestaan: Record<string, unknown> = {};
  if (typeof body.name === "string") toegestaan.name = body.name;
  if (body.status === "concept" || body.status === "gepubliceerd") toegestaan.status = body.status;
  if (body.modus === "sequentieel" || body.modus === "verspreid") toegestaan.modus = body.modus;
  if (Object.keys(toegestaan).length === 0) {
    return NextResponse.json({ fout: "Geen geldige velden" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("routes")
    .update(toegestaan)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { error } = await admin.from("routes").delete().eq("id", params.id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
