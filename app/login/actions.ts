"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function inloggenAction(
  _prevState: { fout: string } | null,
  formData: FormData
): Promise<{ fout: string }> {
  const email = formData.get("email") as string;
  const wachtwoord = formData.get("wachtwoord") as string;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: wachtwoord,
  });

  if (error || !data.user) {
    return { fout: "Ongeldige inloggegevens. Controleer je e-mailadres en wachtwoord." };
  }

  const rol = data.user.app_metadata?.rol;

  if (rol === "admin") {
    redirect("/admin");
  }

  redirect("/speler");
}
