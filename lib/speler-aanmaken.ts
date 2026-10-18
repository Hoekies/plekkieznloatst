import type { createAdminClient } from "@/lib/supabase-admin";
import { loginNaarEmail } from "@/lib/login-naam";

type AdminClient = ReturnType<typeof createAdminClient>;

// Makkelijk te typen wachtwoorden voor teams: een woord en twee cijfers (minimaal 8 tekens)
const WOORDEN = ["tijger", "banaan", "kompas", "piraat", "sterren", "vlinder", "olifant", "pinguin", "dolfijn", "raketje", "zeilboot", "kasteel", "draakje", "schatkist", "tulpen", "molentje"];

export function maakWachtwoord(): string {
  const woord = WOORDEN[Math.floor(Math.random() * WOORDEN.length)];
  return `${woord}${String(Math.floor(Math.random() * 90) + 10)}`;
}

// Eén speler aanmaken: inlogaccount + players-rij. Geeft de speler terug, of een foutmelding.
export async function maakSpeler(admin: AdminClient, loginNaam: string, wachtwoord: string):
  Promise<{ speler: { id: string; login_name: string } } | { fout: string; status: number }> {
  const naam = loginNaam.trim();
  const { data: bestaand } = await admin.from("players").select("id").eq("login_name", naam).maybeSingle();
  if (bestaand) return { fout: "Deze loginnaam is al in gebruik", status: 400 };

  const { data: authData, error: authFout } = await admin.auth.admin.createUser({
    email: loginNaarEmail(naam),
    password: wachtwoord,
    email_confirm: true,
    app_metadata: { rol: "speler" },
  });
  if (authFout || !authData.user) {
    const bericht = authFout?.message?.includes("already registered") ? "Deze loginnaam is al in gebruik" : authFout?.message ?? "Kon gebruiker niet aanmaken";
    return { fout: bericht, status: 400 };
  }

  const { data: speler, error: spelerFout } = await admin
    .from("players")
    // group_name is verplicht in de database maar wordt niet meer getoond; teams kiezen zelf een naam
    .insert({ group_name: naam, login_name: naam, auth_user_id: authData.user.id })
    .select("id, login_name")
    .single();
  if (spelerFout || !speler) {
    // Inlogaccount opruimen als de speler niet aangemaakt kon worden
    await admin.auth.admin.deleteUser(authData.user.id);
    return { fout: spelerFout?.message ?? "Kon speler niet aanmaken", status: 500 };
  }
  return { speler };
}
