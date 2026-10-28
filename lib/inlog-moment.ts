// Het moment waarop een sessie is ingelogd, uit de toegangstoken van Supabase. De "amr"-tijd blijft gelijk
// als de token wordt ververst; pas een nieuwe login geeft een nieuwe tijd. Zo is per toestel te zien of het
// van vóór of na "uitloggen" of "Volgende groep" is (een volgende groep gebruikt dezelfde logins).
// Werkt ook in de middleware (geen Node-functies).
export function inlogMoment(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const deel = token.split(".")[1];
    const json = JSON.parse(atob(deel.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(deel.length / 4) * 4, "=")));
    const tijden = Array.isArray(json.amr) ? json.amr.map((a: { timestamp?: number }) => a.timestamp).filter((t: unknown) => typeof t === "number") : [];
    // Zonder amr (zou niet moeten) het moment van de token zelf
    const sec = tijden.length ? Math.max(...tijden) : typeof json.iat === "number" ? json.iat : null;
    return sec ? new Date(sec * 1000).toISOString() : null;
  } catch {
    return null;
  }
}

// Geweigerd: de beheerder logde dit team uit (of bereidde een nieuwe groep voor) ná het inloggen van deze
// sessie. Zonder bekend inlogmoment telt het als oud.
export function uitgelogdNaLogin(uitgelogdOp: string | null | undefined, login: string | null | undefined): boolean {
  if (!uitgelogdOp) return false;
  if (!login) return true;
  return Date.parse(login) <= Date.parse(uitgelogdOp);
}
