import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { SpelerSessie } from "@/types/database";

// De ingelogde speler, voor speler-pagina's en -API's. null = niet ingelogd of geen speler.
export async function haalSpeler() {
  const user = await haalGebruiker();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return null;
  return { admin, userId: user.id, spelerId: speler.id as string };
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
