// Snelle zelftest van de rekenregels die het spel eerlijk houden (draait in npm run controle)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tekstKlopt, tekstAfstand, binnenVlak, haversine, normaliserenNumeriek } from "../lib/geo";
import { normaliseerPuzzel, puzzelVolgorde, puzzelStand } from "../lib/puzzel";
import { huidigThema, paaszondag, THEMAS } from "../lib/seizoenen";
import { hulpNamen, normaliseerNaam } from "../lib/hulp-namen";

let goed = 0;
function test(naam: string, f: () => void) {
  try { f(); goed++; } catch (e) { console.error(`❌ ${naam}`); throw e; }
}

test("open antwoord: één tikfout mag", () => {
  assert.equal(tekstKlopt("Amsterdm", "Amsterdam"), true);
  assert.equal(tekstKlopt("Amstredam", "Amsterdam"), true);
  assert.equal(tekstKlopt(" sint-jan ", "Sint Jan"), true);
  assert.equal(tekstKlopt("Café", "cafe"), true);
});
test("open antwoord: korte woorden en echte fouten niet", () => {
  assert.equal(tekstKlopt("kar", "kat"), false);
  assert.equal(tekstKlopt("Rotterdam", "Amsterdam"), false);
  assert.equal(tekstKlopt("", "iets"), false);
});
test("bijna goed (voor de beheerder)", () => {
  assert.equal(tekstAfstand("Amstrdm", "Amsterdam"), 2);
  assert.equal(tekstAfstand("AMSTERDAM!", "amsterdam"), 0);
});
test("getal met komma", () => {
  assert.equal(normaliserenNumeriek("3,5"), 3.5);
  assert.equal(normaliserenNumeriek("geen"), null);
});
test("afstand", () => {
  const d = haversine(52.0, 5.0, 52.001, 5.0);
  assert.ok(d > 105 && d < 117, `afstand ${d}`);
});
test("verboden gebied", () => {
  const vlak: [number, number][] = [[0, 0], [0, 1], [1, 1], [1, 0]];
  assert.equal(binnenVlak(0.5, 0.5, vlak), true);
  assert.equal(binnenVlak(1.5, 0.5, vlak), false);
});
test("puzzelwoord", () => {
  assert.equal(normaliseerPuzzel("Plekkie z'n"), "PLEKKIEZN");
  const v = puzzelVolgorde("sessie-1", 7);
  assert.deepEqual([...v].sort(), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(puzzelVolgorde("sessie-1", 7), v);
  const s = puzzelStand("SLEUTEL", "sessie-1", 3, false, 100);
  assert.equal(s.letters.filter(Boolean).length, 3);
  assert.equal(puzzelStand("SLEUTEL", "x", 0, true, 100).letters.join(""), "SLEUTEL");
});

test("seizoensachtergrond op datum", () => {
  const alle = new Set(THEMAS.map((t) => t.sleutel));
  assert.equal(paaszondag(2027).getDate(), 28);
  assert.equal(huidigThema(new Date(2026, 9, 24), alle)?.sleutel, "halloween");
  assert.equal(huidigThema(new Date(2026, 10, 8), alle)?.sleutel, "herfst");
  assert.equal(huidigThema(new Date(2027, 0, 3), alle)?.sleutel, "oudnieuw");
  assert.equal(huidigThema(new Date(2026, 9, 24), new Set(["herfst"]))?.sleutel, "herfst");
  // Vrije thema's hebben geen datum: alleen met 📌, nooit vanzelf
  for (let dag = 0; dag < 366; dag += 1) assert.equal(huidigThema(new Date(2026, 0, 1 + dag), new Set(["eigen1", "eigen2"])), null);
});

// 👆 De hulpkolom wijst knoppen aan op hun naam: elke vetgedrukte knopnaam in de handleiding (met een emoji
// ervoor) moet ook echt in de app staan. Dezelfde regel als de hulpkolom zelf (lib/hulp-namen.ts): "A / B",
// "A → B" en "A en B" tellen als losse namen; tekst tussen haakjes telt niet mee. Uitzonderingen: kopjes in de
// handleiding die geen knop zijn.
test("handleiding noemt alleen knoppen die bestaan", () => {
  const GEEN_KNOP = ["mini-kaart"];
  const norm = normaliseerNaam;
  const bestanden = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true })
    .flatMap((e) => e.isDirectory() ? bestanden(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []);
  const bron = norm(["app", "components", "lib"].flatMap(bestanden).map((b) => fs.readFileSync(b, "utf8")).join("\n").replace(/[{}<>`$/=]/g, " "));
  const md = fs.readFileSync("docs/beheerdershandleiding.md", "utf8");
  const namen = [...md.matchAll(/\*\*(\p{Extended_Pictographic}[^*]{2,60})\*\*/gu)]
    .map((m) => m[1].trim()).filter((k) => !/[.:?]$/.test(k))
    .flatMap(hulpNamen).filter((k) => !GEEN_KNOP.includes(k));
  const mis = [...new Set(namen.filter((k) => !bron.includes(k)))];
  assert.deepEqual(mis, [], `Niet in de app gevonden (pas de handleiding of de knop aan): ${mis.join(", ")}`);
});

console.log(`✅ Zelftest: ${goed} onderdelen goed`);
