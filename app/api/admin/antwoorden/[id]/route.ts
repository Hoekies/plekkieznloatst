import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { keurAntwoordGoed } from "@/lib/antwoord-keuren";

// Eén fout (of half goed) antwoord alsnog goedkeuren
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const r = await keurAntwoordGoed(createAdminClient(), params.id);
  if ("fout" in r) return NextResponse.json({ fout: r.fout }, { status: r.status });
  return NextResponse.json(r);
}
