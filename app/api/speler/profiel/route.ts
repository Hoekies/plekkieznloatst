import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 401 });

  const { group_name, icon } = await request.json();
  if (!group_name?.trim() || !icon) return NextResponse.json({ fout: "Naam en icoon zijn verplicht" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("players")
    .update({ group_name: group_name.trim(), icon })
    .eq("auth_user_id", user.id);

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
