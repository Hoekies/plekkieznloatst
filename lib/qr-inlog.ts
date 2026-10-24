// 📷 Wat er in de QR-code van het inlogkaartje staat, en hoe de app dat weer leest.
// De QR-code logt altijd meteen in: loginnaam en wachtwoord staan achter het #-teken in het adres
// (dat deel gaat nooit naar de server en komt dus niet in logboeken). Op het kaartje staan ze toch al
// leesbaar. Oude kaartjes met een inloglink (/l/<code>) blijven ook werken.

export const SITE = "https://plekkieznloatst.vercel.app";

// Adres voor de QR-code: inlogpagina met de gegevens erachter
export function qrInlogAdres(login: string, wachtwoord: string): string {
  return `${SITE}/login#${new URLSearchParams({ u: login, w: wachtwoord })}`;
}

// Inloggegevens uit het #-deel van een adres (of null)
export function inlogUitHash(hash: string): { login: string; wachtwoord: string } | null {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const login = p.get("u"), wachtwoord = p.get("w");
  return login && wachtwoord ? { login, wachtwoord } : null;
}

// Gescande of geplakte tekst: een inloglink (code) of een kaartje met inloggegevens
export function inlogUitTekst(tekst: string): { code: string } | { login: string; wachtwoord: string } | null {
  const hash = tekst.indexOf("#");
  if (hash >= 0 && /\/login/.test(tekst.slice(0, hash))) {
    const gegevens = inlogUitHash(tekst.slice(hash));
    if (gegevens) return gegevens;
  }
  const m = /\/l\/([A-Za-z0-9_-]{20,80})/.exec(tekst) ?? /^\s*([A-Za-z0-9_-]{20,80})\s*$/.exec(tekst);
  return m ? { code: m[1] } : null;
}

// Inloggen met wat er gescand of geplakt is: een link via /l/, gegevens via de inlogpagina
export function gaInloggen(inlog: { code: string } | { login: string; wachtwoord: string }) {
  if ("code" in inlog) { window.location.assign(`/l/${inlog.code}`); return; }
  const adres = `/login#${new URLSearchParams({ u: inlog.login, w: inlog.wachtwoord })}`;
  // Al op de inlogpagina: alleen het #-deel verandert, de pagina luistert daarop (hashchange)
  window.location.assign(adres);
}
