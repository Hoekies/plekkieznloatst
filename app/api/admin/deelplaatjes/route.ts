import { NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { groepPlaatjes } from "@/lib/deel-plaatjes";

// 🖼️ Gegevens voor de plaatjes voor de groepsapp (alleen de spelleider en helpers), van de actieve route
export async function GET() {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("id").eq("is_active", true).maybeSingle();
  if (!route) return NextResponse.json({ fout: "Er is geen actieve route" }, { status: 400 });
  return NextResponse.json(await groepPlaatjes(admin, route.id));
}
