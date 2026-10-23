import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// 🎨 Huisstijl van de actieve route (migratie 016): eigen kleur, logo en welkomstfoto, plus de geluidset.
// Zonder migratie of zonder actieve route: alles leeg = de gewone PointRush-stijl.
export type Huisstijl = { kleur: string | null; logo: string | null; welkomFoto: string | null; geluidSet: string };

const OPSLAG = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/route-afbeeldingen/`;

// Adres van het eigen logo van een route (of null)
export function huisLogoUrl(route: unknown): string | null {
  const pad = (route as { huisstijl_logo_pad?: string | null } | null)?.huisstijl_logo_pad;
  return pad ? OPSLAG + pad : null;
}

export async function haalHuisstijl(admin: AdminClient): Promise<Huisstijl> {
  const { data } = await admin.from("routes").select("*").eq("is_active", true).maybeSingle();
  const r = (data ?? {}) as { huisstijl_kleur?: string | null; huisstijl_logo_pad?: string | null; welkom_foto_pad?: string | null; geluid_set?: string | null };
  return {
    kleur: r.huisstijl_kleur && /^#[0-9A-Fa-f]{6}$/.test(r.huisstijl_kleur) ? r.huisstijl_kleur : null,
    logo: r.huisstijl_logo_pad ? OPSLAG + r.huisstijl_logo_pad : null,
    welkomFoto: r.welkom_foto_pad ? OPSLAG + r.welkom_foto_pad : null,
    geluidSet: r.geluid_set ?? "klassiek",
  };
}
