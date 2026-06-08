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
  const toegestaan: Record<string, unknown> = {};
  if (typeof body.name === "string") toegestaan.name = body.name;
  if (body.status === "concept" || body.status === "gepubliceerd") toegestaan.status = body.status;
  if (body.modus === "sequentieel" || body.modus === "verspreid") toegestaan.modus = body.modus;
  if (body.is_active === false) toegestaan.is_active = false;
  if (typeof body.verwacht_aantal_teams === "number" && body.verwacht_aantal_teams >= 2) toegestaan.verwacht_aantal_teams = body.verwacht_aantal_teams;
  if (typeof body.doel_afstand_km === "number" && body.doel_afstand_km >= 0) toegestaan.doel_afstand_km = body.doel_afstand_km;
  if (typeof body.ster_waarde === "number" && body.ster_waarde >= 0) toegestaan.ster_waarde = body.ster_waarde;
  if (typeof body.bom_waarde === "number" && body.bom_waarde >= 0) toegestaan.bom_waarde = body.bom_waarde;
  if (typeof body.item_respawn === "boolean") toegestaan.item_respawn = body.item_respawn;
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
