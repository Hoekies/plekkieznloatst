import { createHash, randomBytes } from "crypto";

// Inloglinks (migratie 008): een lange willekeurige code in de link; in de database staat
// alleen de SHA-256-hash, zodat een uitgelekte database geen werkende links oplevert.
export function maakLinkCode(): string {
  return randomBytes(24).toString("base64url");
}

export function hashLinkCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// Toegestane geldigheid in uren (knoppen in het beheer)
export const LINK_UREN = [4, 12, 24, 48] as const;
