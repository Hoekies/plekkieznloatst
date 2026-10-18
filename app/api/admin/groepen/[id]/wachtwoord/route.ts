import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { bewaarWachtwoord, ontsleutel } from "@/lib/wachtwoord-kluis";

// Huidig wachtwoord van een team (uit de versleutelde kopie); null als het onbekend is
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("*").eq("id", params.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Speler niet gevonden" }, { status: 404 });
  return NextResponse.json({ wachtwoord: ontsleutel((speler as { wachtwoord_versleuteld?: string | null }).wachtwoord_versleuteld) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await haalGebruiker();
  if (!user || user.app_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const { wachtwoord } = await request.json();
  if (!wachtwoord || wachtwoord.length < 8) {
    return NextResponse.json({ fout: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players")
    .select("auth_user_id")
    .eq("id", params.id)
    .single();

  if (!speler) return NextResponse.json({ fout: "Groep niet gevonden" }, { status: 404 });

  const { error } = await admin.auth.admin.updateUserById(speler.auth_user_id, {
    password: wachtwoord,
  });

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  // Versleutelde kopie, zodat hetzelfde wachtwoord later opnieuw verstuurd kan worden
  await bewaarWachtwoord(admin, params.id, wachtwoord);
  return NextResponse.json({ ok: true });
}
