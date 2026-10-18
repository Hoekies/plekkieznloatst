import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Eindtijd van het spel instellen (ISO-tijd) of weghalen (null). Is de tijd voorbij, dan sluiten
// de spelers-app en het dashboard de lopende spellen af (lib/eindtijd.ts).
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (!isAdmin(user)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });

  const body = await request.json().catch(() => null);
  const waarde = body?.eindtijd ?? null;
  let eindtijd: string | null = null;
  if (waarde !== null) {
    const d = new Date(String(waarde));
    if (Number.isNaN(d.getTime())) return NextResponse.json({ fout: "Ongeldige tijd" }, { status: 400 });
    if (d.getTime() < Date.now() - 60000) return NextResponse.json({ fout: "Die tijd is al voorbij" }, { status: 400 });
    eindtijd = d.toISOString();
  }

  const admin = createAdminClient();
  const { error } = await admin.from("routes").update({ eindtijd }).eq("id", params.id);
  if (error) {
    const migratie = /eindtijd/.test(error.message);
    return NextResponse.json({ fout: migratie ? "Draai eerst SQL-bestand 006 in Supabase" : error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, eindtijd });
}
