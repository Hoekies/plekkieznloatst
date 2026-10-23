import { NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalHuisstijl } from "@/lib/huisstijl";

// 🎨 Huisstijl van de actieve route (o.a. het logo op de inlogkaartjes)
export async function GET() {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  return NextResponse.json(await haalHuisstijl(createAdminClient()));
}
