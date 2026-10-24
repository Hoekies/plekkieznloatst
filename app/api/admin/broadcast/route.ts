import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const user = await haalGebruiker();
  if (!isAdmin(user)) {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  // player_id: alleen aan dat team (migratie 009); zonder: aan alle teams
  const { bericht, player_id } = await request.json();
  const aanTeam = typeof player_id === "string" && /^[0-9a-f-]{36}$/i.test(player_id) ? player_id : null;
  if (!bericht || typeof bericht !== "string" || !bericht.trim()) {
    return NextResponse.json({ fout: "Bericht ontbreekt" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("broadcasts")
    .insert(aanTeam ? { bericht: bericht.trim().slice(0, 150), player_id: aanTeam } : { bericht: bericht.trim().slice(0, 150) });

  if (error) {
    const migratie = /player_id/.test(error.message);
    return NextResponse.json({ fout: migratie ? "Draai eerst SQL-bestand 009 in Supabase" : error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
