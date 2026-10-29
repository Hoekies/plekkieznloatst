// 🧪 Testrol van een speler (migratie 005): los van lib/testteam.ts, zodat ook kleine modules hem kunnen
// gebruiken zonder de hele testteamcode (en zijn imports) mee te nemen.
export type TestRol = "team" | "tegenstander" | null;
export const testRol = (p: unknown): TestRol => {
  const r = (p as { test_rol?: string | null } | null)?.test_rol;
  return r === "team" || r === "tegenstander" ? r : null;
};
