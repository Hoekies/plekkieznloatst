import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { marked } from "marked";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { ankerVan, losseAnkersNaarHandleiding } from "@/lib/handleiding-ankers";

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

// 🎯 Hulp bij het onderdeel van de editor waar je nu bent (de editor zet dat in <html data-hulp="…">): eerst
// een korte uitleg met precies de stukken uit de handleiding die daarbij horen, daaronder de hele hulp.
// Elk stuk begint met de tekst hieronder; de regels die erbij horen (dieper ingesprongen, of hetzelfde
// citaatblok) komen mee.
const ONDERDELEN: Record<string, { titel: string; begin: string[] }> = {
  vraag: { titel: "Een vraag invullen", begin: ["- **De vraag-editor**", "- **Goed of fout**", "- Bij een meerkeuzevraag kun je", "- Bij een open vraag kies je", "- **💬 Uitleg per antwoord**", "- **Punten**", "- **⚙️ Meer instellingen**", "- **🏷️ Naam van het punt**", "> **📚 Vragenbank**", "> **💡 Ideeën**"] },
  punt: { titel: "Een punt aanpassen", begin: ["6. Klik op een punt", "7. Sleep een punt"] },
  items: { titel: "Items", begin: ["> **✨ Items verdelen**"] },
  instellingen: { titel: "Instellingen", begin: ["> **🗺️ Wat zien de spelers?**", "> **🗑️ Leegmaken**"] },
  controle: { titel: "Klaar om te spelen?", begin: ["8. Klaar?", "> **Status van een route**"] },
  kaart: { titel: "De kaart en de werkbalk", begin: ["> **Overzicht in de editor (computer)**", "> **🧲 Op de weg**", "> **↶ Ongedaan maken.**"] },
};
// Welk hoofdstuk hoort er bovenaan open bij een onderdeel
const ONDERDEEL_KOP: Record<string, string> = { items: "3. Speciale items plaatsen (optioneel)", instellingen: "2. Speltype en route-instellingen" };

function stukUit(regels: string[], begin: string): string {
  const i = regels.findIndex((r) => r.trimStart().startsWith(begin));
  if (i < 0) return "";
  const inspring = regels[i].length - regels[i].trimStart().length;
  const citaat = regels[i].trimStart().startsWith(">");
  const uit = [regels[i]];
  for (let j = i + 1; j < regels.length; j++) {
    const r = regels[j];
    if (citaat ? r.trimStart().startsWith(">") : (r.trim() && r.length - r.trimStart().length > inspring)) uit.push(r);
    else break;
  }
  // Ingesprongen lijstregels gelijk naar links, zodat het een gewone lijst wordt
  return uit.map((r) => r.slice(Math.min(inspring, r.length - r.trimStart().length))).join("\n");
}

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
  return `<details id="${ankerVan(s.kop)}" class="hulp-blok hulp-niveau-${s.niveau}"${open ? " open" : ""}><summary>${marked.parseInline(s.kop, { async: false })}</summary>${html}</details>`;
}

export async function GET(request: NextRequest) {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const pad = request.nextUrl.searchParams.get("pad") ?? "/admin";
  // Losse vraag-editor (eigen pagina): altijd het onderdeel "vraag"
  const onderdeel = /^\/admin\/routes\/[^/]+\/punten\//.test(pad) ? "vraag" : request.nextUrl.searchParams.get("onderdeel") ?? "";
  const pagina = PAGINAS.find((p) => (p.pad.endsWith("/") ? pad.startsWith(p.pad) : pad === p.pad || pad.startsWith(p.pad + "/")))
    ?? { titel: "Handleiding", koppen: ["Overzicht"] as string[], alinea: undefined };
  let tekst = "";
  try { tekst = fs.readFileSync(path.join(process.cwd(), "docs", "beheerdershandleiding.md"), "utf8"); }
  catch { return NextResponse.json({ fout: "De handleiding kon niet geladen worden" }, { status: 500 }); }

  const alle = stukken(tekst);
  const focus = ONDERDELEN[onderdeel];
  // Bij een onderdeel: het bijbehorende hoofdstuk eerst (open), de rest dicht
  const voorKop = ONDERDEEL_KOP[onderdeel];
  const koppen = voorKop && pagina.koppen.includes(voorKop) ? [voorKop, ...pagina.koppen.filter((k) => k !== voorKop)] : pagina.koppen;
  let html = koppen.map((kop, n) => {
    const i = alle.findIndex((s) => s.kop === kop);
    return i < 0 ? "" : hoofdstuk(alle, i, n === 0 && !focus);
  }).join("");
  if (focus) {
    const regels = tekst.split(/\r?\n/);
    const deel = focus.begin.map((b) => stukUit(regels, b)).filter(Boolean).join("\n\n");
    if (deel) html = `<section class="hulp-focus"><div class="hulp-focus-kop">🎯 Nu: ${focus.titel}</div>${marked.parse(deel, { async: false })}</section>` + html;
  }
  if (pagina.alinea) {
    const alinea = tekst.split(/\r?\n\r?\n/).find((a) => a.startsWith(pagina.alinea!));
    if (alinea) html += marked.parse(alinea, { async: false }) as string;
  }
  return NextResponse.json({ titel: focus ? `${pagina.titel} · ${focus.titel}` : pagina.titel, html: losseAnkersNaarHandleiding(html) || "<p>Voor deze pagina is nog geen uitleg.</p>" });
}
