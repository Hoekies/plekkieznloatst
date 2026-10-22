import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sluitStemmingen } from "@/lib/stemmen";

// 🗳️ Stemming van één stemvraag nu sluiten (Antwoorden → 📊 Per vraag): POST { punt_id }
export async function POST(request: NextRequest) {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.punt_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.punt_id)) return NextResponse.json({ fout: "Ongeldig punt" }, { status: 400 });
  const admin = createAdminClient();
  const { data: punt } = await admin.from("route_points").select("route_id").eq("id", body.punt_id).maybeSingle();
  if (!punt) return NextResponse.json({ fout: "Punt niet gevonden" }, { status: 404 });
  const n = await sluitStemmingen(admin, punt.route_id, body.punt_id);
  return NextResponse.json({ ok: true, gesloten: n });
}
