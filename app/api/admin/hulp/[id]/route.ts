import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Melding negeren: het team moet het punt toch zelf halen
export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (!isBeheer(user)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("hulpverzoeken")
    .update({ status: "genegeerd", afgehandeld_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("status", "open");
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
