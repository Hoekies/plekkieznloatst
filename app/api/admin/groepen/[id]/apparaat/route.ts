import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function checkAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.app_metadata?.rol === "admin" ? user : null;
}

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("players")
    .update({ active_device_id: null })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}
