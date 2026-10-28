"use client";

// Spelen zonder bereik: wat niet aankomt (punt bereikt, doorgaan, een antwoord) wordt op het toestel
// bewaard en later in dezelfde volgorde verstuurd, zodra er weer bereik is. Zo kan een team in het
// buitengebied gewoon doorspelen.
//
// Elke opdracht hoort bij één spel (sessie): de server controleert dat, zodat een antwoord na uitloggen of
// een nieuw spel nooit bij een ander team of spel terechtkomt. Weigert de server een opdracht, dan verdwijnt
// die niet stil: hij komt met de reden in de lijst "niet verstuurd", die de speler ziet.
const SLEUTEL = "pr_wachtrij";
const MISLUKT = "pr_wachtrij_mislukt";
type Opdracht = { url: string; body: Record<string, unknown>; tijd: number; sessie?: string | null };
export type MislukteOpdracht = Opdracht & { reden: string };
type Verstuurd = { status: "ok"; res: Response } | { status: "fout"; res: Response } | { status: "bewaard" };

// Het spel waar nieuwe opdrachten bij horen (gezet door de kaart)
let huidigeSessie: string | null = null;
export function zetWachtrijSessie(id: string | null) {
  huidigeSessie = id;
  // Wachtende opdrachten van een ander spel: niet meer versturen, maar laten zien
  const lijst = lees();
  const anders = lijst.filter((o) => o.sessie && id && o.sessie !== id);
  if (anders.length) {
    schrijf(lijst.filter((o) => !anders.includes(o)));
    schrijfMislukt([...leesMislukt(), ...anders.map((o) => ({ ...o, reden: "Hoort bij een eerder spel; niet meer verstuurd" }))]);
  }
}

const luisteraars = new Set<(aantal: number) => void>();
const misluktLuisteraars = new Set<(lijst: MislukteOpdracht[]) => void>();
function lees(): Opdracht[] {
  try { return JSON.parse(localStorage.getItem(SLEUTEL) ?? "[]"); } catch { return []; }
}
function schrijf(lijst: Opdracht[]) {
  try { localStorage.setItem(SLEUTEL, JSON.stringify(lijst)); } catch { /* geen opslag */ }
  luisteraars.forEach((f) => f(lijst.length));
}
export function leesMislukt(): MislukteOpdracht[] {
  try { return JSON.parse(localStorage.getItem(MISLUKT) ?? "[]"); } catch { return []; }
}
function schrijfMislukt(lijst: MislukteOpdracht[]) {
  try { localStorage.setItem(MISLUKT, JSON.stringify(lijst.slice(-20))); } catch { /* geen opslag */ }
  misluktLuisteraars.forEach((f) => f(lijst));
}
export function wisMislukt() { schrijfMislukt([]); }
export function wachtrijAantal() { return lees().length; }
export function opWachtrij(f: (aantal: number) => void): () => void {
  luisteraars.add(f);
  return () => { luisteraars.delete(f); };
}
export function opMislukt(f: (lijst: MislukteOpdracht[]) => void): () => void {
  misluktLuisteraars.add(f);
  return () => { misluktLuisteraars.delete(f); };
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Later opnieuw proberen bij pauze (409 met pauze), een tijdelijk geblokkeerd punt (423) of een serverfout
async function opnieuwLater(res: Response) {
  if (res.status >= 500 || res.status === 423 || res.status === 429) return true;
  if (res.status === 409) return !!(await res.clone().json().catch(() => ({}))).pauze;
  return false;
}
// 409 "al bereikt" / "al verwerkt": de stap is al gedaan (bijv. eerder toch aangekomen); niets kwijt
async function alGedaan(res: Response) {
  if (res.status !== 409) return false;
  const fout = String((await res.clone().json().catch(() => ({}))).fout ?? "");
  return /al (bereikt|verwerkt|afgerond)/i.test(fout);
}

let bezig: Promise<void> | null = null;
export function verstuurWachtrij(): Promise<void> {
  bezig ??= (async () => {
    try {
      for (let lijst = lees(); lijst.length; lijst = lees()) {
        const o = lijst[0];
        let res: Response;
        try { res = await post(o.url, o.body); } catch { return; }  // nog geen bereik
        if (!res.ok && await opnieuwLater(res)) return;
        if (!res.ok && !await alGedaan(res)) {
          // Geweigerd: bewaren met de reden, zodat het team (of de spelleider) het ziet
          const reden = String((await res.clone().json().catch(() => ({}))).fout ?? `Fout ${res.status}`);
          schrijfMislukt([...leesMislukt(), { ...o, reden }]);
        }
        schrijf(lees().slice(1));
      }
    } finally { bezig = null; }
  })();
  return bezig;
}

// Versturen, of bij geen bereik bewaren. Staat er al iets te wachten, dan eerst dat (de volgorde telt).
// De sessie gaat mee (sessie_id), zodat de server een opdracht van een ander spel weigert.
export async function stuur(url: string, body: Record<string, unknown>): Promise<Verstuurd> {
  const metSessie = huidigeSessie ? { ...body, sessie_id: huidigeSessie } : body;
  if (lees().length) await verstuurWachtrij();
  if (!lees().length) {
    try {
      const res = await post(url, metSessie);
      return { status: res.ok ? "ok" : "fout", res };
    } catch { /* geen bereik: bewaren */ }
  }
  schrijf([...lees(), { url, body: metSessie, tijd: Date.now(), sessie: huidigeSessie }]);
  return { status: "bewaard" };
}
