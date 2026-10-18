import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { normaliseerTelefoon } from "@/lib/telefoon";

// Telefoonnummer van een team opslaan of weghalen (leeg)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });
  const body = await request.json().catch(() => null);
  const invoer = typeof body?.telefoon === "string" ? body.telefoon : "";
  const telefoon = invoer.trim() ? normaliseerTelefoon(invoer) : null;
  if (invoer.trim() && !telefoon) return NextResponse.json({ fout: "Dat is geen geldig telefoonnummer" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("players").update({ telefoon }).eq("id", params.id);
  if (error) {
    const migratie = /telefoon/.test(error.message);
    return NextResponse.json({ fout: migratie ? "Draai eerst SQL-bestand 009 in Supabase" : error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, telefoon });
}
