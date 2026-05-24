import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { loginNaarEmail } from "@/lib/login-naam";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players")
    .select("login_name, group_name")
    .eq("id", params.id)
    .single();

  if (!speler) return NextResponse.json({ fout: "Groep niet gevonden" }, { status: 404 });

  const email = loginNaarEmail(speler.login_name);
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json({
    link: data.properties.action_link,
    groepNaam: speler.group_name,
  });
}
