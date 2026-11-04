import { createHash, randomBytes } from "crypto";

// Inloglinks (migratie 008): een lange willekeurige code in de link; in de database staat
// alleen de SHA-256-hash, zodat een uitgelekte database geen werkende links oplevert.
export function maakLinkCode(): string {
  return randomBytes(24).toString("base64url");
}

export function hashLinkCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// Toegestane geldigheid in uren: de knoppen in het beheer (4 uur, 1 dag, 3 dagen, 5 dagen) en 12 voor de QR-code bij de start
export const LINK_UREN = [4, 12, 24, 72, 120] as const;
