import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    // Device vrijgeven bij uitloggen
    await admin
      .from("players")
      .update({ active_device_id: null })
      .eq("auth_user_id", user.id);
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
}
