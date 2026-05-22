import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const wachtwoord = formData.get("wachtwoord") as string;

  if (!email || !wachtwoord) {
    return NextResponse.redirect(new URL("/login?fout=leeg", request.url), { status: 303 });
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
