import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { GOUDEN_MIN } from "@/lib/spelplezier";

// ⏰ Gouden kwartier (migratie 007): POST { aan: true } = vanaf nu 15 minuten dubbele punten op de actieve route,
// { aan: false } = meteen stoppen
export async function POST(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { aan?: boolean };
  const tot = body.aan ? new Date(Date.now() + GOUDEN_MIN * 60_000).toISOString() : null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("routes").update({ gouden_tot: tot }).eq("is_active", true).select("id");
  if (error) return NextResponse.json({ fout: /gouden_tot/.test(error.message) ? "Draai eerst migratie 007 (spelplezier) in Supabase" : error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ fout: "Er is geen actieve route" }, { status: 400 });
  return NextResponse.json({ ok: true, gouden_tot: tot });
}
