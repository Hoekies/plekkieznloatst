import { NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalAntwoorden } from "@/lib/admin-antwoorden";

export async function GET() {
  const user = await haalGebruiker();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  return NextResponse.json(await haalAntwoorden(createAdminClient()));
}
