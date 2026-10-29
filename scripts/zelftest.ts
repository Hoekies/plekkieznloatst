// Snelle zelftest van de rekenregels die het spel eerlijk houden (draait in npm run controle)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tekstKlopt, tekstAfstand, binnenVlak, haversine, normaliserenNumeriek } from "../lib/geo";
import { normaliseerPuzzel, puzzelVolgorde, puzzelStand } from "../lib/puzzel";
import { huidigThema, paaszondag, THEMAS } from "../lib/seizoenen";
import { hulpNamen, normaliseerNaam } from "../lib/hulp-namen";
import { bonusPunten, bonusOpen } from "../lib/bonus";
import { testRol } from "../lib/test-rol";
import { RAD_VAKKEN, radHalverwege, spelplezierAan, goudenNu, BADGES, schatSlot } from "../lib/spelplezier";
import { deelPrijzenUit } from "../lib/prijzen";
import { DUEL_VRAGEN } from "../lib/duel-vragen";

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

test("bonusvraag: eerste alles, daarna steeds minder", () => {
  // 3 teams, 90 punten: 90 · 60 · 30
  assert.deepEqual([1, 2, 3].map((p) => bonusPunten(90, 3, p)), [90, 60, 30]);
  // 3 teams, 100 punten: afgerond 100 · 67 · 33; goed is altijd minstens 1 punt
  assert.deepEqual([1, 2, 3, 4].map((p) => bonusPunten(100, 3, p)), [100, 67, 33, 1]);
  assert.equal(bonusPunten(100, 0, 1), 100);
  const nu = Date.now();
  assert.equal(bonusOpen({ gestart_op: new Date(nu - 30_000).toISOString(), duur_seconden: 60 }, nu), true);
  assert.equal(bonusOpen({ gestart_op: new Date(nu - 61_000).toISOString(), duur_seconden: 60 }, nu), false);
  assert.equal(bonusOpen({ gestart_op: null, duur_seconden: 60 }, nu), false);
});

test("testteam: alleen bekende rollen, zonder kolom een echt team", () => {
  assert.equal(testRol({ test_rol: "team" }), "team");
  assert.equal(testRol({ test_rol: "tegenstander" }), "tegenstander");
  assert.equal(testRol({ test_rol: "iets" }), null);
  assert.equal(testRol({}), null);
  assert.equal(testRol(null), null);
});

test("prijzen: elk team één titel, niemand dubbel", () => {
  const t = (id: string, tijd: number, goed: number, items: Record<string, number> = {}) => ({ id, tijd, afstand: 1000, goed, items, geraakt: 0 });
  const p = deelPrijzenUit([t("a", 3000, 5), t("b", 2000, 3, { dief: 2 }), t("c", 4000, 1), t("d", 5000, 1)]);
  assert.equal(p.get("a")?.titel, "Slimste team");
  assert.equal(p.get("b")?.titel, "Snelste team");
  assert.equal(p.size, 4);
  assert.equal(new Set([...p.values()].map((x) => x.titel)).size, 4);
  assert.equal(deelPrijzenUit([]).size, 0);
});

test("spelplezier: rad, halverwege, aan/uit, gouden kwartier en badges", () => {
  assert.equal(RAD_VAKKEN.length, 8);
  assert.equal(new Set(RAD_VAKKEN.map((v) => v.id)).size, 8);
  assert.equal(radHalverwege(2, 5), false);
  assert.equal(radHalverwege(3, 5), true);
  assert.equal(radHalverwege(1, 1), false);
  assert.deepEqual(spelplezierAan({}), { val: false, reeks: false, badges: false, fotobattle: false, schat: false, rad: false });
  assert.equal(spelplezierAan({ val_aan: true, rad_aan: true }).val, true);
  const nu = Date.parse("2026-10-29T12:00:00Z");
  assert.equal(goudenNu({ gouden_tot: "2026-10-29T12:05:00Z" }, nu), true);
  assert.equal(goudenNu({ gouden_tot: "2026-10-29T11:55:00Z" }, nu), false);
  assert.equal(goudenNu(null, nu), false);
  for (const b of Object.values(BADGES)) assert.ok(b.emoji && b.naam && b.uitleg);
  assert.equal(schatSlot(0), 0);
  assert.equal(schatSlot(10 * 60_000 - 1), 0);
  assert.equal(schatSlot(10 * 60_000), 1);
});

test("fotobattle: meeste stemmen krijgt de prijs, gelijkspel niet", () => {
  const basis = { tijd: 100, afstand: 0, goed: 0, items: {}, geraakt: 0 };
  const uit = deelPrijzenUit([{ ...basis, id: "a", stemmen: 3 }, { ...basis, id: "b", stemmen: 1 }]);
  assert.equal(uit.get("a")?.titel, "Mooiste foto");
  const gelijk = deelPrijzenUit([{ ...basis, id: "a", stemmen: 2 }, { ...basis, id: "b", stemmen: 2 }]);
  assert.notEqual(gelijk.get("a")?.titel, "Mooiste foto");
  assert.notEqual(gelijk.get("b")?.titel, "Mooiste foto");
});

test("duelvragen: vier keuzes en een geldig goed antwoord", () => {
  assert.ok(DUEL_VRAGEN.length >= 20);
  for (const v of DUEL_VRAGEN) {
    assert.equal(v.keuzes.length, 4, v.vraag);
    assert.ok(v.goed >= 0 && v.goed < 4, v.vraag);
  }
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
