import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// 🔒 Gelopen routes (exacte GPS) en foutmeldingen niet langer bewaren dan nodig: na 30 dagen weg. Een lopend spel
// raakt dit niet. Foto's, teamnamen en antwoorden blijven tot de spelleider het spel opruimt (🧹 Opruimen).
export const BEWAAR_DAGEN = 30;

export async function verwijderOudeGegevens(admin: AdminClient) {
  const grens = new Date(Date.now() - BEWAAR_DAGEN * 24 * 3600 * 1000).toISOString();
  const { count, error } = await admin.from("location_updates").delete({ count: "exact" }).lt("created_at", grens);
  await admin.from("client_fouten").delete().lt("created_at", grens);
  return { count: count ?? 0, error };
}

// Vanzelf, als de beheerder het dashboard opent: hoogstens eens per 6 uur (per serverproces), en een fout mag het
// dashboard nooit tegenhouden
let laatste = 0;
export async function ruimOudeGegevensOp(admin: AdminClient) {
  if (Date.now() - laatste < 6 * 3600 * 1000) return;
  laatste = Date.now();
  await verwijderOudeGegevens(admin).catch(() => undefined);
}
