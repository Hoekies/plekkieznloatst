import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { loginNaarEmail } from "@/lib/login-naam";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const { loginNaam } = await request.json();
  if (!loginNaam?.trim()) return NextResponse.json({ fout: "Vul een naam in" }, { status: 400 });

  const admin = createAdminClient();

  // Controleer of naam al in gebruik is door iemand anders
  const { data: bestaand } = await admin
    .from("players")
    .select("id")
    .eq("login_name", loginNaam.trim())
    .neq("id", params.id)
    .maybeSingle();
  if (bestaand) return NextResponse.json({ fout: "Deze loginnaam is al in gebruik" }, { status: 400 });

  // Haal de huidige speler op voor de auth_user_id
  const { data: speler } = await admin
    .from("players")
    .select("auth_user_id")
    .eq("id", params.id)
    .single();
  if (!speler) return NextResponse.json({ fout: "Groep niet gevonden" }, { status: 404 });

  const nieuwEmail = loginNaarEmail(loginNaam.trim());

  // Update het e-mailadres in Supabase Auth
  const { error: authFout } = await admin.auth.admin.updateUserById(speler.auth_user_id, {
    email: nieuwEmail,
    email_confirm: true,
  });
  if (authFout) return NextResponse.json({ fout: authFout.message }, { status: 500 });

  // Update login_name in players tabel
  const { error } = await admin
    .from("players")
    .update({ login_name: loginNaam.trim() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
