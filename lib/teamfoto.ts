import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// 📸 Standaard opdracht bij een nieuwe finish: de foto komt als teamfoto in de einduitslag
export const FINISH_FOTO_OPDRACHT = "Maak een groepsfoto of selfie met het hele team";

// Een nieuwe finish krijgt de foto-opdracht (0 punten; de beheerder kan hem aanpassen of weghalen)
export async function zetFinishOpdracht(admin: AdminClient, puntId: string): Promise<void> {
  const { data: bestaand } = await admin.from("questions").select("id").eq("route_point_id", puntId).maybeSingle();
  if (bestaand) return;
  await admin.from("questions").insert({ route_point_id: puntId, type: "foto_opdracht", question_text: FINISH_FOTO_OPDRACHT, points: 0 });
}

// Teamfoto per sessie: de goedgekeurde foto bij de finish (groepsfoto of selfie). Alleen goedgekeurde foto's,
// zodat er niets ongewensts op het podium of de beamer komt. Geeft een tijdelijke link (12 uur) per sessie.
export async function teamFotos(admin: AdminClient, routeId: string, sessieIds: string[]): Promise<Map<string, string>> {
  const uit = new Map<string, string>();
  if (!sessieIds.length) return uit;
  const { data: eind } = await admin.from("route_points").select("id").eq("route_id", routeId).eq("type", "eindpunt");
  const eindIds = (eind ?? []).map((p) => p.id);
  if (!eindIds.length) return uit;
  const { data: fotos } = await admin.from("foto_inzendingen").select("session_id, foto_pad")
    .in("session_id", sessieIds).in("route_point_id", eindIds).eq("status", "goedgekeurd");
  const lijst = (fotos ?? []) as { session_id: string; foto_pad: string }[];
  if (!lijst.length) return uit;
  const { data: links } = await admin.storage.from("foto-inzendingen").createSignedUrls(lijst.map((f) => f.foto_pad), 12 * 3600);
  lijst.forEach((f, i) => { const url = links?.[i]?.signedUrl; if (url) uit.set(f.session_id, url); });
  return uit;
}
