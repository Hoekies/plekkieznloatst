import { NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST() {
  const user = await haalGebruiker();
  if (!isAdmin(user)) {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const admin = createAdminClient();
  await admin.from("routes").update({ tussenstand_trigger_at: new Date().toISOString() }).eq("is_active", true);

  return NextResponse.json({ ok: true });
}
