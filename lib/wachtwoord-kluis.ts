import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Wachtwoorden van teams versleuteld bewaren (migratie 011), zodat de beheerder bij opnieuw
// versturen hetzelfde wachtwoord kan meesturen. Inloggen zelf gaat via Supabase Auth (hash);
// dit is alleen een versleutelde kopie. De sleutel wordt afgeleid van de service-sleutel, die
// alleen de server kent. Alleen voor de server: nooit in de browser gebruiken.
function sleutel(): Buffer {
  return createHash("sha256").update(`pointrush-wachtwoord:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest();
}

export function versleutel(tekst: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", sleutel(), iv);
  const data = Buffer.concat([c.update(tekst, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]).toString("base64");
}

export function ontsleutel(waarde: string | null | undefined): string | null {
  if (!waarde) return null;
  try {
    const buf = Buffer.from(waarde, "base64");
    const d = createDecipheriv("aes-256-gcm", sleutel(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;  // andere sleutel of beschadigd: dan is het wachtwoord gewoon onbekend
  }
}

// Kopie bijwerken; ontbreekt de kolom nog (migratie 011 niet gedraaid), dan gebeurt er niets
export async function bewaarWachtwoord(admin: AdminClient, spelerId: string, wachtwoord: string) {
  await admin.from("players").update({ wachtwoord_versleuteld: versleutel(wachtwoord) }).eq("id", spelerId);
}
