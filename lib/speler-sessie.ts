import { cookies } from "next/headers";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { SpelerSessie } from "@/types/database";
import { uitgelogdNaLogin } from "@/lib/inlog-moment";

// De ingelogde speler, voor speler-pagina's en -API's. null = niet ingelogd of geen speler.
// Ook null als de beheerder het team heeft uitgeschakeld of uitgelogd, of als de tijd van een inloglink om is:
// dat wordt hier bij elk verzoek gecontroleerd, niet alleen door de app zelf (device-check).
export async function haalSpeler() {
  const user = await haalGebruiker();
  if (!user) return null;
  const admin = createAdminClient();
  // "*": toegang_tot (migratie 008) en is_uitgeschakeld mogen ontbreken zonder dat iedereen eruit vliegt
  const { data: speler } = await admin.from("players").select("*").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return null;
  const s = speler as { id: string; is_uitgeschakeld?: boolean | null; force_logout_at?: string | null; toegang_tot?: string | null; active_device_id?: string | null };
  // Eén telefoon per team: komt dit verzoek van een andere telefoon dan de geregistreerde, dan weigeren.
  // Zonder cookie (oude app, of nog niet gezet) gewoon door: de app-controle (device-check) vangt dat op.
  const toestel = cookies().get("pr_toestel")?.value;
  if (s.active_device_id && toestel && toestel !== s.active_device_id) return null;
  // Uitgelogd door de beheerder (of "Volgende groep"): alleen sessies van vóór dat moment; wie daarna
  // opnieuw inlogt, mag gewoon verder
  if (s.is_uitgeschakeld || uitgelogdNaLogin(s.force_logout_at, user.login)) return null;
  if (s.toegang_tot && Date.parse(s.toegang_tot) <= Date.now()) return null;
  return { admin, userId: user.id, spelerId: s.id };
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
