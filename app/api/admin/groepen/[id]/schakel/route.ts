import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function checkAdmin() {
  const user = await haalGebruiker();
  return user?.app_metadata?.rol === "admin" ? user : null;
}

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players")
    .select("is_uitgeschakeld")
    .eq("id", params.id)
    .maybeSingle();

  if (!speler) return NextResponse.json({ fout: "Groep niet gevonden" }, { status: 404 });

  const { data, error } = await admin
    .from("players")
    .update({ is_uitgeschakeld: !speler.is_uitgeschakeld })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}
