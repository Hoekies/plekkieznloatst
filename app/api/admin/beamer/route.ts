import { NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { beamerSleutel } from "@/lib/beamer";

// De link naar het beamerscherm van de actieve route (voor de knop 📺 op de live kaart)
export async function GET() {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { data: route } = await createAdminClient().from("routes").select("id").eq("is_active", true).maybeSingle();
  if (!route) return NextResponse.json({ fout: "Er is geen actieve route" }, { status: 404 });
  return NextResponse.json({ pad: `/beamer/${await beamerSleutel(route.id)}` });
}
