"use client";

// Spelen zonder bereik: wat niet aankomt (punt bereikt, doorgaan, een antwoord) wordt op het toestel
// bewaard en later in dezelfde volgorde verstuurd, zodra er weer bereik is. Zo kan een team in het
// buitengebied gewoon doorspelen.
const SLEUTEL = "pr_wachtrij";
type Opdracht = { url: string; body: unknown; tijd: number };
export type Verstuurd = { status: "ok"; res: Response } | { status: "fout"; res: Response } | { status: "bewaard" };

const luisteraars = new Set<(aantal: number) => void>();
function lees(): Opdracht[] {
  try { return JSON.parse(localStorage.getItem(SLEUTEL) ?? "[]"); } catch { return []; }
}
function schrijf(lijst: Opdracht[]) {
  try { localStorage.setItem(SLEUTEL, JSON.stringify(lijst)); } catch { /* geen opslag */ }
  luisteraars.forEach((f) => f(lijst.length));
}
export function wachtrijAantal() { return lees().length; }
export function opWachtrij(f: (aantal: number) => void): () => void {
  luisteraars.add(f);
  return () => { luisteraars.delete(f); };
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Later opnieuw proberen bij pauze (409 met pauze), een tijdelijk geblokkeerd punt (423) of een serverfout;
// andere fouten (al bereikt, spel voorbij) betekenen dat de stap niet meer nodig is
async function opnieuwLater(res: Response) {
  if (res.status >= 500 || res.status === 423 || res.status === 429) return true;
  if (res.status === 409) return !!(await res.clone().json().catch(() => ({}))).pauze;
  return false;
}

let bezig: Promise<void> | null = null;
export function verstuurWachtrij(): Promise<void> {
  bezig ??= (async () => {
    try {
      for (let lijst = lees(); lijst.length; lijst = lees()) {
        let res: Response;
        try { res = await post(lijst[0].url, lijst[0].body); } catch { return; }  // nog geen bereik
        if (!res.ok && await opnieuwLater(res)) return;
        schrijf(lees().slice(1));
      }
    } finally { bezig = null; }
  })();
  return bezig;
}

// Versturen, of bij geen bereik bewaren. Staat er al iets te wachten, dan eerst dat (de volgorde telt).
export async function stuur(url: string, body: unknown): Promise<Verstuurd> {
  if (lees().length) await verstuurWachtrij();
  if (!lees().length) {
    try {
      const res = await post(url, body);
      return { status: res.ok ? "ok" : "fout", res };
    } catch { /* geen bereik: bewaren */ }
  }
  schrijf([...lees(), { url, body, tijd: Date.now() }]);
  return { status: "bewaard" };
}
