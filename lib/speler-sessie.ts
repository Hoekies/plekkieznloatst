import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { SpelerSessie } from "@/types/database";
import { uitgelogdNaLogin } from "@/lib/inlog-moment";

// De ingelogde speler, voor speler-pagina's en -API's. null = niet ingelogd of geen speler.
// Ook null als de beheerder het team heeft uitgeschakeld of uitgelogd, of als de tijd van een inloglink om is:
// dat wordt hier bij elk verzoek gecontroleerd, niet alleen door de app zelf (device-check).
export async function haalSpeler() {
  const uit = await spelerOfReden();
  return "reden" in uit ? null : uit;
}

// Waarom een speler geweigerd wordt; de inlogpagina toont bij elke reden een eigen melding (?fout=…)
type Weigering = "geen" | "apparaat" | "uitgeschakeld" | "uitgelogd" | "verlopen";

async function spelerOfReden(): Promise<{ admin: ReturnType<typeof createAdminClient>; userId: string; spelerId: string } | { reden: Weigering }> {
  const user = await haalGebruiker();
  if (!user) return { reden: "geen" };
  const admin = createAdminClient();
  // "*": toegang_tot (migratie 008) en is_uitgeschakeld mogen ontbreken zonder dat iedereen eruit vliegt
  const { data: speler } = await admin.from("players").select("*").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return { reden: "geen" };
  const s = speler as { id: string; is_uitgeschakeld?: boolean | null; force_logout_at?: string | null; toegang_tot?: string | null; active_device_id?: string | null };
  // Eén telefoon per team: komt dit verzoek van een andere telefoon dan de geregistreerde, dan weigeren.
  // Zonder cookie (oude app, of nog niet gezet) gewoon door: de app-controle (device-check) vangt dat op.
  const toestel = cookies().get("pr_toestel")?.value;
  if (s.active_device_id && toestel && toestel !== s.active_device_id) return { reden: "apparaat" };
  if (s.is_uitgeschakeld) return { reden: "uitgeschakeld" };
  // Uitgelogd door de beheerder (of "Volgende groep"): alleen sessies van vóór dat moment; wie daarna
  // opnieuw inlogt, mag gewoon verder
  if (uitgelogdNaLogin(s.force_logout_at, user.login)) return { reden: "uitgelogd" };
  if (s.toegang_tot && Date.parse(s.toegang_tot) <= Date.now()) return { reden: "verlopen" };
  return { admin, userId: user.id, spelerId: s.id };
}

// Voor speler-pagina's: de speler, of naar de inlogpagina mét de reden. Vroeger ging een geweigerd toestel
// zonder uitleg terug naar de login (bijv. een iPhone die de QR-link in Safari opent terwijl het team al in
// de app speelt): dan leek het scannen gewoon niet te werken.
export async function spelerOfNaarLogin() {
  const uit = await spelerOfReden();
  if ("reden" in uit) redirect(uit.reden === "geen" ? "/login" : `/login?fout=${uit.reden}`);
  return uit;
}

// De ingelogde speler en zijn spel. Standaard alleen een lopend spel;
// ookVoltooid: het laatste lopende of gefinishte spel (finish, terugkijken).
export async function haalSpelerSessie({ ookVoltooid = false }: { ookVoltooid?: boolean } = {}) {
  const ik = await haalSpeler();
  if (!ik) return null;
  const { admin, userId, spelerId } = ik;
  const basis = admin.from("player_sessions").select("*").eq("player_id", spelerId);
  const { data: sessie } = ookVoltooid
    ? await basis.in("status", ["actief", "voltooid"]).order("started_at", { ascending: false }).limit(1).maybeSingle()
    : await basis.eq("status", "actief").maybeSingle();
  return { admin, userId, spelerId, sessie: (sessie ?? null) as SpelerSessie | null };
}
