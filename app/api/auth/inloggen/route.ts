import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";
import { loginNaarEmail } from "@/lib/login-naam";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const naam = (formData.get("naam") as string)?.trim();
  const wachtwoord = formData.get("wachtwoord") as string;

  if (!naam || !wachtwoord) {
    return NextResponse.redirect(new URL("/login?fout=leeg", request.url), { status: 303 });
  }

  // Bepaal het e-mailadres: spelers loggen in met login_name, admins met e-mail
  let email = naam;
  if (!naam.includes("@")) {
    // Speler: zoek op login_name in de players tabel
    const admin = createAdminClient();
    const { data: speler } = await admin
      .from("players")
      .select("login_name")
      .eq("login_name", naam)
      .maybeSingle();

    if (speler) {
      // Gevonden: converteer naar intern e-mailadres
      email = loginNaarEmail(naam);
    } else {
      return NextResponse.redirect(new URL("/login?fout=ongeldig", request.url), { status: 303 });
    }
  }

  // Vang auth-cookies op zodat we ze op de redirect-response kunnen plakken
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => { pendingCookies.push(...cookiesToSet); },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord });

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?fout=ongeldig", request.url), { status: 303 });
  }

  const rol = data.user.user_metadata?.rol;
  const redirectNaar = rol === "admin" ? "/admin" : "/speler";
  const isDev = process.env.NODE_ENV === "development";

  const response = NextResponse.redirect(new URL(redirectNaar, request.url), { status: 303 });
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(
      name,
      value,
      isDev ? { ...options, secure: false, sameSite: "lax" } : (options as Parameters<typeof response.cookies.set>[2])
    );
  });

  return response;
}
