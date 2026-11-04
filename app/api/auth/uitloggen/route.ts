import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";

// Uitloggen. Een formulier (speler) krijgt een doorverwijzing naar de login; wie om JSON vraagt (het beheer) krijgt te
// horen of het gelukt is. Beheerders en helpers loggen alleen op dit toestel uit: hun telefoon en pc staan vaak tegelijk aan.
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

  const rol = user?.app_metadata?.rol;
  const { error } = await supabase.auth.signOut({ scope: rol === "admin" || rol === "helper" ? "local" : "global" });
  if (request.headers.get("accept")?.includes("application/json")) {
    if (error) return NextResponse.json({ fout: "Uitloggen lukte niet: probeer het opnieuw" }, { status: 502 });
    const gelukt = NextResponse.json({ ok: true });
    response.cookies.getAll().forEach((c) => gelukt.cookies.set(c));
    return gelukt;
  }
  return response;
}
