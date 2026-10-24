// 📷 Wat er in de QR-code van het inlogkaartje staat, en hoe de app dat weer leest.
// Met een inloglink (/l/<code>): die link; de server bewaakt hoe lang hij werkt en hij is in te trekken.
// Zonder link: loginnaam en wachtwoord achter het #-teken in het adres (dat deel gaat nooit naar de server
// en komt dus niet in logboeken; op het kaartje staan ze toch al leesbaar), met een einddatum. Na die
// datum logt scannen niet meer vanzelf in: dan vult de app alleen de loginnaam in.

export const SITE = "https://plekkieznloatst.vercel.app";

// Hoe lang scannen meteen inlogt
export const QR_UREN = 48;

// Einddatum van een nieuwe QR-code: over 48 uur, afgerond op het hele uur (zo blijft de code gelijk
// zolang het kaartje open staat)
export function qrGeldigTot(): Date {
  const uur = 3600_000;
  return new Date(Math.ceil((Date.now() + QR_UREN * uur) / uur) * uur);
}

type Gegevens = { login: string; wachtwoord: string; tot: number };

const hashVan = (g: Gegevens) => new URLSearchParams({ u: g.login, w: g.wachtwoord, t: String(Math.round(g.tot / 1000)) });

// Adres voor de QR-code: inlogpagina met de gegevens en de einddatum erachter
export function qrInlogAdres(login: string, wachtwoord: string, tot: Date): string {
  return `${SITE}/login#${hashVan({ login, wachtwoord, tot: tot.getTime() })}`;
}

// Inloggegevens uit het #-deel van een adres (of null)
export function inlogUitHash(hash: string): Gegevens | null {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const login = p.get("u"), wachtwoord = p.get("w"), t = Number(p.get("t"));
  // Zonder einddatum (kaartjes van v0.13.4): als verlopen behandelen
  return login && wachtwoord ? { login, wachtwoord, tot: t ? t * 1000 : 0 } : null;
}

// Gescande of geplakte tekst: een inloglink (code) of een kaartje met inloggegevens
export function inlogUitTekst(tekst: string): { code: string } | Gegevens | null {
  const hash = tekst.indexOf("#");
  if (hash >= 0 && /\/login/.test(tekst.slice(0, hash))) {
    const gegevens = inlogUitHash(tekst.slice(hash));
    if (gegevens) return gegevens;
  }
  const m = /\/l\/([A-Za-z0-9_-]{20,80})/.exec(tekst) ?? /^\s*([A-Za-z0-9_-]{20,80})\s*$/.exec(tekst);
  return m ? { code: m[1] } : null;
}

// Inloggen met wat er gescand of geplakt is: een link via /l/, gegevens via de inlogpagina
export function gaInloggen(inlog: { code: string } | Gegevens) {
  if ("code" in inlog) { window.location.assign(`/l/${inlog.code}`); return; }
  // Al op de inlogpagina: alleen het #-deel verandert, de pagina luistert daarop (hashchange)
  window.location.assign(`/login#${hashVan(inlog)}`);
}
