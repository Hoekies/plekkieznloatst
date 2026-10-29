// ⚡ Bonusvraag (migratie 004): regels die server, beheer en zelftest delen.

export type BonusVraag = {
  id: string;
  route_id: string;
  vraag: string;
  soort: "meerkeuze" | "foto";
  keuzes: string[] | null;
  goed_index: number | null;
  punten: number;
  na_minuten: number | null;
  duur_seconden: number;
  gestart_op: string | null;
  aantal_teams: number | null;
  created_at: string;
};

export type BonusAntwoord = {
  id: string;
  bonus_id: string;
  session_id: string;
  keuze: number | null;
  foto_pad: string | null;
  foto_status: "wacht" | "goedgekeurd" | "afgekeurd" | null;
  is_correct: boolean | null;
  punten: number;
  beantwoord_op: string;
};

export const BONUS_DUUR_KEUZES = [60, 120, 300, 600] as const;

// De instelbare velden van een bonusvraag, gecontroleerd (beheer, kopie en import); null = ongeldig
export type BonusVelden = Pick<BonusVraag, "vraag" | "soort" | "keuzes" | "goed_index" | "punten" | "duur_seconden" | "na_minuten">;
export function bonusVelden(b: Record<string, unknown>): BonusVelden | null {
  const vraag = typeof b.vraag === "string" ? b.vraag.trim().slice(0, 300) : "";
  const soort = b.soort === "foto" ? "foto" : b.soort === "meerkeuze" ? "meerkeuze" : null;
  const punten = Number(b.punten), duur = Number(b.duur_seconden);
  const na = b.na_minuten === null || b.na_minuten === undefined || b.na_minuten === "" ? null : Number(b.na_minuten);
  if (!vraag || !soort || !Number.isInteger(punten) || punten < 1 || punten > 1000) return null;
  if (!Number.isInteger(duur) || duur < 30 || duur > 3600) return null;
  if (na !== null && (!Number.isInteger(na) || na < 0 || na > 600)) return null;
  let keuzes: string[] | null = null, goed: number | null = null;
  if (soort === "meerkeuze") {
    keuzes = (Array.isArray(b.keuzes) ? b.keuzes : []).map((k) => String(k ?? "").trim().slice(0, 80)).filter(Boolean).slice(0, 4);
    goed = Number(b.goed_index);
    if (keuzes.length < 2 || !Number.isInteger(goed) || goed < 0 || goed >= keuzes.length) return null;
  }
  return { vraag, soort, keuzes, goed_index: goed, punten, duur_seconden: duur, na_minuten: na };
}

// Punten voor de zoveelste goede (1 = eerste): bij n teams krijgt de eerste alles, de tweede (n-1)/n, enz.
// Minstens 1 punt zolang je goed bent; na de n-de (meer goede antwoorden dan teams kan niet) ook 1.
export function bonusPunten(max: number, aantalTeams: number, plek: number): number {
  const n = Math.max(1, aantalTeams);
  if (plek < 1) return 0;
  return Math.max(1, Math.round((max * Math.max(0, n - plek + 1)) / n));
}

// Wanneer start deze vraag vanzelf? Na_minuten na de start van het eerste team (null = alleen met de knop)
export function bonusStartMoment(v: Pick<BonusVraag, "na_minuten">, eersteStart: string | null): number | null {
  if (v.na_minuten == null || !eersteStart) return null;
  return Date.parse(eersteStart) + v.na_minuten * 60_000;
}

// Staat hij nu open? (gestart en de tijd is nog niet om)
export function bonusOpen(v: Pick<BonusVraag, "gestart_op" | "duur_seconden">, nu = Date.now()): boolean {
  if (!v.gestart_op) return false;
  const start = Date.parse(v.gestart_op);
  return nu >= start && nu < start + v.duur_seconden * 1000;
}

export function bonusRestSeconden(v: Pick<BonusVraag, "gestart_op" | "duur_seconden">, nu = Date.now()): number {
  if (!v.gestart_op) return 0;
  return Math.max(0, Math.ceil((Date.parse(v.gestart_op) + v.duur_seconden * 1000 - nu) / 1000));
}
