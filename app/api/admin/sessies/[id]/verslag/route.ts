import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalRouteVerslag } from "@/lib/team-verslag";

// Alles van één speler in één keer: gelopen spoor, bezochte punten met antwoorden en items.
// Voor het detailvenster op het dashboard.
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  return NextResponse.json(await haalRouteVerslag(admin, params.id));
}
