import { NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { uitslagTekst } from "@/lib/uitslag-tekst";

// 💬 De uitslag van de actieve route als één WhatsApp-bericht (stand, prijzen, cijfers per team, records)
export async function GET() {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("id").eq("is_active", true).maybeSingle();
  if (!route) return NextResponse.json({ fout: "Er is geen actieve route" }, { status: 400 });
  return NextResponse.json({ tekst: await uitslagTekst(admin, route.id) });
}
