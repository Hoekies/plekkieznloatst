import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Verwijder in de juiste volgorde (FK constraints)
  await admin.from("player_point_progress").delete().not("id", "is", null);
  await admin.from("location_updates").delete().not("id", "is", null);
  await admin.from("player_sessions").delete().not("id", "is", null);

  return NextResponse.json({ ok: true });
}
