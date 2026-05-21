import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const { wachtwoord } = await request.json();
  if (!wachtwoord || wachtwoord.length < 8) {
    return NextResponse.json({ fout: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Zoek de auth_user_id op via het players id
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

  return NextResponse.json({ ok: true });
}
