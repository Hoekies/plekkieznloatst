import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.nextUrl.origin), { status: 303 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, secure: process.env.NODE_ENV !== "development" })
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    await admin
      .from("players")
      .update({ active_device_id: null })
      .eq("auth_user_id", user.id);
  }

  await supabase.auth.signOut();
  return response;
}
