import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("players")
    .update({ force_logout_at: new Date().toISOString(), active_device_id: null })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}
