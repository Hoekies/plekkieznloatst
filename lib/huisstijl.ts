import type { createAdminClient } from "@/lib/supabase-admin";
import { huidigThema, SEIZOEN_KOLOM, VAST_SLEUTEL, bestaandThema, type SeizoenSoort } from "@/lib/seizoenen";

type AdminClient = ReturnType<typeof createAdminClient>;

// 🎨 Huisstijl van de actieve route (migratie 016): eigen kleur, logo en welkomstfoto, plus de geluidset.
// Zonder migratie of zonder actieve route: alles leeg = de gewone PointRush-stijl.
type Huisstijl = { kleur: string | null; logo: string | null; welkomFoto: string | null; geluidSet: string };

// Openbare map met geüploade afbeeldingen (logo's, foto's, seizoensafbeeldingen)
export const OPSLAG = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/route-afbeeldingen/`;

// Adres van het eigen logo van een route (of null)
export function huisLogoUrl(route: unknown): string | null {
  const pad = (route as { huisstijl_logo_pad?: string | null } | null)?.huisstijl_logo_pad;
  return pad ? OPSLAG + pad : null;
}

export async function haalHuisstijl(admin: AdminClient): Promise<Huisstijl> {
  const { data } = await admin.from("routes").select("*").eq("is_active", true).maybeSingle();
  const r = (data ?? {}) as { huisstijl_kleur?: string | null; huisstijl_logo_pad?: string | null; welkom_foto_pad?: string | null; geluid_set?: string | null };
  // Geen eigen welkomstfoto: de achtergrond van het seizoen of de feestdag van nu (migratie 019)
  if (!r.welkom_foto_pad) r.welkom_foto_pad = await seizoenPad(admin, "achtergrond");
  return {
    kleur: r.huisstijl_kleur && /^#[0-9A-Fa-f]{6}$/.test(r.huisstijl_kleur) ? r.huisstijl_kleur : null,
    logo: r.huisstijl_logo_pad ? OPSLAG + r.huisstijl_logo_pad : null,
    welkomFoto: r.welkom_foto_pad ? OPSLAG + r.welkom_foto_pad : null,
    geluidSet: r.geluid_set ?? "klassiek",
  };
}

// 🗓️ De seizoensafbeelding van dit moment (achtergrond of spellogo; migratie 019/020), of null.
// Feestdag gaat voor seizoen; alleen thema's waarvoor deze soort is geüpload tellen mee.
// 📌 Is een thema vastgezet, dan altijd dat thema; heeft het deze soort niet, dan het gewone (null),
// zodat achtergrond en logo's nooit uit verschillende thema's komen.
export async function seizoenPad(admin: AdminClient, soort: SeizoenSoort): Promise<string | null> {
  const kolom = SEIZOEN_KOLOM[soort];
  // "*": zonder migratie 020 ontbreken de logokolommen; dan is er gewoon geen seizoenslogo
  const { data } = await admin.from("seizoen_achtergronden").select("*");
  const rijen = (data ?? []) as unknown as Record<string, string | null>[];
  const vast = rijen.find((r) => r.thema === VAST_SLEUTEL)?.pad;
  const metBeeld = rijen.filter((r) => r.thema !== VAST_SLEUTEL && r[kolom]);
  const sleutel = bestaandThema(vast) ? vast : huidigThema(new Date(), new Set(metBeeld.map((r) => r.thema as string)))?.sleutel;
  return sleutel ? metBeeld.find((r) => r.thema === sleutel)?.[kolom] ?? null : null;
}

// 📌 Het vastgezette thema (beheer → Seizoenen), of null = automatisch op datum
export async function vastThema(admin: AdminClient): Promise<string | null> {
  const { data } = await admin.from("seizoen_achtergronden").select("pad").eq("thema", VAST_SLEUTEL).maybeSingle();
  const pad = (data as { pad?: string | null } | null)?.pad;
  return bestaandThema(pad) ? pad : null;
}
