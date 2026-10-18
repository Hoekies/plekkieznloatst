import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// "Wijzigingen naar spelers sturen": alle spelers-apps lezen de route binnen een paar seconden opnieuw in
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("routes").update({ spelers_vernieuwen_at: new Date().toISOString() }).eq("id", params.id);
  if (error) {
    const migratie = /spelers_vernieuwen_at/.test(error.message);
    return NextResponse.json({ fout: migratie ? "Draai eerst SQL-bestand 005 in Supabase" : error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
