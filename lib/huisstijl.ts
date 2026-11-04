import type { createAdminClient } from "@/lib/supabase-admin";
import { isKleurThema } from "@/lib/kleurthema";
import { huidigThema, standaardBeeld, SEIZOEN_KOLOM, VAST_SLEUTEL, NAMEN_SLEUTEL, THEMAS, bestaandThema, isInstelRij, leesNamen, type SeizoenSoort } from "@/lib/seizoenen";

type AdminClient = ReturnType<typeof createAdminClient>;

// 🎨 Huisstijl van de actieve route (migratie 016): eigen kleur, logo en welkomstfoto, plus de geluidset.
// Zonder migratie of zonder actieve route: alles leeg = de gewone PointRush-stijl.
// thema: kleurthema van de spelersapp (migratie 011), null = paars
type Huisstijl = { kleur: string | null; logo: string | null; welkomFoto: string | null; geluidSet: string; thema: string | null };

// Openbare map met geüploade afbeeldingen (logo's, foto's, seizoensafbeeldingen)
export const OPSLAG = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/route-afbeeldingen/`;

// Adres van het eigen logo van een route (of null)
export function huisLogoUrl(route: unknown): string | null {
  const pad = (route as { huisstijl_logo_pad?: string | null } | null)?.huisstijl_logo_pad;
  return pad ? OPSLAG + pad : null;
}

export async function haalHuisstijl(admin: AdminClient): Promise<Huisstijl> {
  const { data } = await admin.from("routes").select("*").eq("is_active", true).maybeSingle();
  const r = (data ?? {}) as { huisstijl_kleur?: string | null; huisstijl_logo_pad?: string | null; welkom_foto_pad?: string | null; geluid_set?: string | null; huis_thema?: string | null };
  // Geen eigen welkomstfoto: de achtergrond van het seizoen of de feestdag van nu (migratie 019)
  const welkomFoto = r.welkom_foto_pad ? OPSLAG + r.welkom_foto_pad : await seizoenBeeld(admin, "achtergrond");
  return {
    kleur: r.huisstijl_kleur && /^#[0-9A-Fa-f]{6}$/.test(r.huisstijl_kleur) ? r.huisstijl_kleur : null,
    logo: r.huisstijl_logo_pad ? OPSLAG + r.huisstijl_logo_pad : null,
    welkomFoto,
    geluidSet: r.geluid_set ?? "klassiek",
    thema: isKleurThema(r.huis_thema) ? r.huis_thema : null,
  };
}

// 🗓️ Het adres van de seizoensafbeelding van dit moment (achtergrond of spellogo; migratie 019/020), of null.
// Feestdag gaat voor seizoen. Per thema: de geüploade afbeelding, anders de standaard (public/seizoenen).
// 📌 Is een thema vastgezet, dan altijd dat thema; heeft een vrij thema deze soort niet, dan het gewone (null),
// zodat achtergrond en logo's nooit uit verschillende thema's komen.
export async function seizoenBeeld(admin: AdminClient, soort: SeizoenSoort): Promise<string | null> {
  const kolom = SEIZOEN_KOLOM[soort];
  // "*": zonder migratie 020 ontbreken de logokolommen; dan is er gewoon geen seizoenslogo
  const { data } = await admin.from("seizoen_achtergronden").select("*");
  const rijen = (data ?? []) as unknown as Record<string, string | null>[];
  const vast = rijen.find((r) => r.thema === VAST_SLEUTEL)?.pad;
  const metBeeld = rijen.filter((r) => !isInstelRij(r.thema) && r[kolom]);
  // Elk thema met datum heeft een standaard, dus die doen altijd mee
  const sleutel = bestaandThema(vast) ? vast : huidigThema(new Date(), new Set(THEMAS.filter((t) => !t.eigen).map((t) => t.sleutel)))?.sleutel;
  if (!sleutel) return null;
  const pad = metBeeld.find((r) => r.thema === sleutel)?.[kolom];
  return pad ? OPSLAG + pad : standaardBeeld(sleutel, soort);
}

// 📌 Het vastgezette thema (beheer → Seizoenen), of null = automatisch op datum
export async function vastThema(admin: AdminClient): Promise<string | null> {
  const { data } = await admin.from("seizoen_achtergronden").select("pad").eq("thema", VAST_SLEUTEL).maybeSingle();
  const pad = (data as { pad?: string | null } | null)?.pad;
  return bestaandThema(pad) ? pad : null;
}

// ✏️ Het emoji van een vrij thema zoals de beheerder het instelde (of null), bijv. voor de versiering van de finish
export async function eigenEmoji(admin: AdminClient, sleutel: string | null): Promise<string | null> {
  if (!sleutel || !THEMAS.some((t) => t.eigen && t.sleutel === sleutel)) return null;
  const { data } = await admin.from("seizoen_achtergronden").select("pad").eq("thema", NAMEN_SLEUTEL).maybeSingle();
  return leesNamen((data as { pad?: string | null } | null)?.pad)[sleutel]?.emoji || null;
}
