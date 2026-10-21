import { NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalGebeurtenissen } from "@/lib/gebeurtenissen";

// Tijdlijn voor het dashboard: wat er in het lopende spel gebeurt, nieuwste eerst.
export async function GET() {
  const user = await haalGebruiker();
  if (!isBeheer(user)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  return NextResponse.json({ gebeurtenissen: await haalGebeurtenissen(createAdminClient()) });
}
