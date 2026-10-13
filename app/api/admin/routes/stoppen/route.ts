import { NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST() {
  const user = await haalGebruiker();
  if (!user || user.app_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const admin = createAdminClient();

  await admin.from("routes").update({ is_active: false }).eq("is_active", true);

  return NextResponse.json({ ok: true });
}
