import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { marked } from "marked";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";

// ❓ Hulp bij de pagina waar je zit (hulpkolom; let op: /api/admin/hulp is iets anders, de hulpvragen van teams): de stukken uit docs/beheerdershandleiding.md die bij die pagina horen,
// als HTML voor de hulpkolom. Eén bron: wie de handleiding bijwerkt, werkt ook de hulp bij.
// Elk hoofdstuk en elk onderwerp daarbinnen wordt in- en uitklapbaar (<details>).

// Per pagina (pad of begin van het pad): de koppen uit de handleiding, of een alinea die met die tekst begint
const PAGINAS: { pad: string; titel: string; koppen: string[]; alinea?: string }[] = [
  { pad: "/admin/routes/", titel: "Route bewerken", koppen: ["1. Route aanmaken", "2. Speltype en route-instellingen", "3. Speciale items plaatsen (optioneel)", "Extra's per vraag en per route"] },
  { pad: "/admin/routes", titel: "Routes", koppen: ["1. Route aanmaken", "2. Speltype en route-instellingen", "Het spel starten"] },
  { pad: "/admin/groepen", titel: "Spelers", koppen: ["4. Spelers aanmaken"] },
  { pad: "/admin/kaartjes", titel: "Inlogkaartjes", koppen: ["Inloggegevens per team uitdelen"] },
  { pad: "/admin/antwoorden", titel: "Antwoorden", koppen: ["Antwoorden & uitslag", "De stand"] },
  { pad: "/admin/rapport", titel: "Rapport", koppen: ["Antwoorden & uitslag"] },
  { pad: "/admin/leaderboard", titel: "Stand", koppen: ["De stand"] },
  { pad: "/admin/live", titel: "Live kaart", koppen: ["Live volgen"] },
  { pad: "/admin/seizoenen", titel: "Seizoenen", koppen: [], alinea: "**🗓️ Seizoenen" },
  { pad: "/admin/systeem", titel: "Systeemcheck", koppen: ["🩺 Systeemcheck"] },
  { pad: "/admin", titel: "Dashboard", koppen: ["Het spel starten", "Live volgen", "Tijdens het spel"] },
];

type Stuk = { niveau: number; kop: string; regels: string[] };

// De handleiding in stukken: elke kop met de regels eronder (tot de volgende kop)
function stukken(tekst: string): Stuk[] {
  const uit: Stuk[] = [];
  for (const regel of tekst.split(/\r?\n/)) {
    const m = /^(#{2,4}) (.+)$/.exec(regel);
    if (m) uit.push({ niveau: m[1].length, kop: m[2].trim(), regels: [] });
    else uit.at(-1)?.regels.push(regel);
  }
  return uit;
}

// Een hoofdstuk als HTML: de tekst bovenaan, daaronder elk onderwerp als uitklapbaar blok
function hoofdstuk(alle: Stuk[], i: number, open: boolean): string {
  const s = alle[i];
  let html = marked.parse(s.regels.join("\n"), { async: false }) as string;
  for (let j = i + 1; j < alle.length && alle[j].niveau > s.niveau; j++) {
    if (alle[j].niveau === s.niveau + 1) html += hoofdstuk(alle, j, false);
  }
  return `<details class="hulp-blok hulp-niveau-${s.niveau}"${open ? " open" : ""}><summary>${marked.parseInline(s.kop, { async: false })}</summary>${html}</details>`;
}

export async function GET(request: NextRequest) {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const pad = request.nextUrl.searchParams.get("pad") ?? "/admin";
  const pagina = PAGINAS.find((p) => (p.pad.endsWith("/") ? pad.startsWith(p.pad) : pad === p.pad || pad.startsWith(p.pad + "/")))
    ?? { titel: "Handleiding", koppen: ["Overzicht"] as string[], alinea: undefined };
  let tekst = "";
  try { tekst = fs.readFileSync(path.join(process.cwd(), "docs", "beheerdershandleiding.md"), "utf8"); }
  catch { return NextResponse.json({ fout: "De handleiding kon niet geladen worden" }, { status: 500 }); }

  const alle = stukken(tekst);
  let html = pagina.koppen.map((kop, n) => {
    const i = alle.findIndex((s) => s.kop === kop);
    return i < 0 ? "" : hoofdstuk(alle, i, n === 0);
  }).join("");
  if (pagina.alinea) {
    const alinea = tekst.split(/\r?\n\r?\n/).find((a) => a.startsWith(pagina.alinea!));
    if (alinea) html += marked.parse(alinea, { async: false }) as string;
  }
  return NextResponse.json({ titel: pagina.titel, html: html || "<p>Voor deze pagina is nog geen uitleg.</p>" });
}
