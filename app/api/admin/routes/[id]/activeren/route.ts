import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  // Deactiveer alle routes
  await admin.from("routes").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  // Activeer deze route
  const { data, error } = await admin
    .from("routes")
    .update({ is_active: true, status: "gepubliceerd" })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}
