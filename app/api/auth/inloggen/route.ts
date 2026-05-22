import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const wachtwoord = formData.get("wachtwoord") as string;

  if (!email || !wachtwoord) {
    return NextResponse.json({ fout: "E-mailadres en wachtwoord zijn verplicht" }, { status: 400 });
  }

  // Vang auth-cookies op zodat we ze op de response kunnen plakken
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => pendingCookies.push(...cookiesToSet),
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord });

  if (error || !data.user) {
    return NextResponse.json(
      { fout: "Ongeldige inloggegevens. Controleer je e-mailadres en wachtwoord." },
      { status: 401 }
    );
  }

  const rol = data.user.user_metadata?.rol;
  const redirectNaar = rol === "admin" ? "/admin" : "/speler";

  // Cookies op de JSON-response zetten zodat de browser ze opslaat vóór de navigatie
  const response = NextResponse.json({ redirect: redirectNaar });
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  return response;
}
