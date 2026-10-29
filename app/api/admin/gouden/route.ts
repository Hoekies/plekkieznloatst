import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { plezierInstellingen } from "@/lib/spelplezier";

// ⏰ Gouden kwartier (migratie 007): POST { aan: true } = vanaf nu dubbele punten op de actieve route (duur en
// vermenigvuldiger uit de instellingen, migratie 008), { aan: false } = meteen stoppen. Stoppen zet het moment op
// "nu", zodat ook een vanzelf gestart kwartier (op een tijdstip) voor vandaag uit blijft.
export async function POST(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { aan?: boolean };
  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("*").eq("is_active", true).maybeSingle();
  if (!route) return NextResponse.json({ fout: "Er is geen actieve route" }, { status: 400 });
  const tot = new Date(Date.now() + (body.aan ? plezierInstellingen(route).gouden.minuten * 60_000 : 0)).toISOString();
  const { data, error } = await admin.from("routes").update({ gouden_tot: tot }).eq("id", route.id).select("id");
  if (error) return NextResponse.json({ fout: /gouden_tot/.test(error.message) ? "Draai eerst migratie 007 (spelplezier) in Supabase" : error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ fout: "Er is geen actieve route" }, { status: 400 });
  return NextResponse.json({ ok: true, gouden_tot: tot });
}
