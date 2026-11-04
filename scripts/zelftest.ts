// Snelle zelftest van de rekenregels die het spel eerlijk houden (draait in npm run controle)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tekstKlopt, tekstAfstand, binnenVlak, haversine, normaliserenNumeriek } from "../lib/geo";
import { normaliseerPuzzel, puzzelVolgorde, puzzelStand } from "../lib/puzzel";
import { huidigThema, kleinBeeld, nederlandseDag, paaszondag, standaardBeeld, SEIZOEN_KOLOM, THEMAS, type SeizoenSoort } from "../lib/seizoenen";
import { FINISH_THEMAS, huidigFinishThema, spelThema, spelLogo, themaAchtergrond } from "../lib/finish-thema";
import { ACHTERGROND_VOORBEELD, LOGO_REFERENTIES, THEMA_INVUL, achtergrondPrompt, achtergrondPromptGemini, logoBreedPrompt, logoPrompt, logoVierkantPrompt } from "../lib/seizoen-prompts";
import { hulpNamen, normaliseerNaam } from "../lib/hulp-namen";
import { bonusPunten, bonusOpen } from "../lib/bonus";
import { testRol } from "../lib/test-rol";
import { RAD_VAKKEN, radHalverwege, spelplezierAan, goudenNu, goudenStatus, BADGES, schatSlot, normaliseerPlezier, radVakken, STANDAARD } from "../lib/spelplezier";
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
  assert.equal(goudenNu({ gouden_tot: "2026-10-29T12:05:00Z", spelplezier: { gouden: { aan: true } } }, nu), true);
  assert.equal(goudenNu({ gouden_tot: "2026-10-29T12:05:00Z" }, nu), false);
  assert.equal(goudenNu({ gouden_tot: "2026-10-29T11:55:00Z" }, nu), false);
  assert.equal(goudenNu(null, nu), false);
  for (const b of Object.values(BADGES)) assert.ok(b.emoji && b.naam && b.uitleg);
  assert.equal(schatSlot(0), 0);
  assert.equal(schatSlot(10 * 60_000 - 1), 0);
  assert.equal(schatSlot(10 * 60_000), 1);
});

test("spelplezier-instellingen: standaard, alleen geldige keuzes, rad en gouden kwartier", () => {
  assert.deepEqual(normaliseerPlezier(null), STANDAARD);
  const i = normaliseerPlezier({ val: { meter: 99, punten: 25, zetterKrijgt: true }, reeks: { lengte: 4, items: ["ster", "hack"] }, fotobattle: { punten: 50, prijs: "  🍰 taart  " }, gouden: { om: "25:00" } });
  assert.equal(i.val.meter, STANDAARD.val.meter);
  assert.equal(i.val.punten, 25);
  assert.equal(i.val.zetterKrijgt, true);
  assert.equal(i.reeks.lengte, 4);
  assert.deepEqual(i.reeks.items, ["ster"]);
  assert.equal(i.fotobattle.prijs, "🍰 taart");
  assert.equal(i.gouden.om, null);
  assert.equal(normaliseerPlezier({ rad: { moment: 0.34 } }).rad.moment, 1 / 3);
  assert.ok(radVakken({ moment: 0.5, zonderMin: true, hoofdprijs: 200 }).every((v) => (v.punten ?? 0) >= 0));
  assert.equal(radVakken({ moment: 0.5, zonderMin: false, hoofdprijs: 200 })[0].punten, 200);
  assert.equal(radHalverwege(2, 6, 1 / 3), true);
  assert.equal(radHalverwege(3, 6, 2 / 3), false);
  // Vanzelf om 14:00 (Nederlandse tijd, wintertijd = UTC+1), 15 minuten, ×3
  const route = { spelplezier: { gouden: { aan: true, om: "14:00", minuten: 15, factor: 3 } } };
  assert.equal(goudenStatus({ spelplezier: { gouden: { aan: false, om: "14:00" } }, gouden_tot: "2026-11-10T14:00:00Z" }, Date.parse("2026-11-10T13:05:00Z")), null);
  assert.equal(normaliseerPlezier({ gouden: { minuten: 5 } }).gouden.minuten, 5);
  assert.equal(goudenStatus(route, Date.parse("2026-11-10T13:05:00Z"))?.factor, 3);
  assert.equal(goudenStatus(route, Date.parse("2026-11-10T13:20:00Z")), null);
  // Gestopt met de knop binnen het venster: blijft uit
  assert.equal(goudenStatus({ ...route, gouden_tot: "2026-11-10T13:03:00Z" }, Date.parse("2026-11-10T13:05:00Z")), null);
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
  // Carnaval gaat voor Valentijn: elke carnavalsdag is carnaval, ook als de hele periode binnen Valentijn valt (2026)
  assert.equal(huidigThema(new Date(2026, 1, 10), alle)?.sleutel, "carnaval");
  assert.equal(huidigThema(new Date(2026, 1, 20), alle)?.sleutel, "valentijn");
  // Kleine versie voor een tegel: het adres zit gecodeerd in de url, de breedte is een toegestane maat
  assert.equal(kleinBeeld("/seizoenen/kerst-achtergrond.webp", 384), "/_next/image?url=%2Fseizoenen%2Fkerst-achtergrond.webp&w=384&q=70");
  // Late Pasen: 27 april blijft Koningsdag, de dagen eromheen blijven Pasen; zonder Koningsdag-afbeelding gewoon Pasen
  for (const jaar of [2030, 2038]) {
    assert.equal(huidigThema(new Date(jaar, 3, 27), alle)?.sleutel, "koningsdag");
    assert.equal(huidigThema(new Date(jaar, 3, 26), alle)?.sleutel, "pasen");
    assert.equal(huidigThema(new Date(jaar, 3, 28), alle)?.sleutel, "pasen");
  }
  assert.equal(huidigThema(new Date(2030, 3, 27), new Set(["pasen"]))?.sleutel, "pasen");
  const carnaval = THEMAS.find((t) => t.sleutel === "carnaval")!;
  for (let jaar = 2026; jaar <= 2040; jaar += 1) {
    const [van, tot] = carnaval.periode(jaar);
    for (const d = new Date(van); d <= tot; d.setDate(d.getDate() + 1)) assert.equal(huidigThema(d, alle)?.sleutel, "carnaval", `carnaval ${jaar}`);
  }
  // Vrije thema's hebben geen datum: alleen met 📌, nooit vanzelf
  for (let dag = 0; dag < 366; dag += 1) assert.equal(huidigThema(new Date(2026, 0, 1 + dag), new Set(["eigen1", "eigen2"])), null);
});

test("seizoenen: elk thema heeft alles, en elke plek volgt het vastgezette thema", () => {
  for (const t of THEMAS) {
    assert.ok(t.sleutel in FINISH_THEMAS, `${t.sleutel} heeft geen finish en confetti`);
    assert.equal(huidigFinishThema(new Date(2026, 5, 1), t.sleutel), t.sleutel, `vastzetten van ${t.sleutel} geldt niet`);
    for (const soort of Object.keys(SEIZOEN_KOLOM) as SeizoenSoort[]) {
      const beeld = standaardBeeld(t.sleutel, soort);
      // Vrije thema's beginnen leeg; de rest moet een standaardbestand hebben
      if (t.eigen) assert.equal(beeld, null);
      else assert.ok(beeld && fs.existsSync(path.join("public", beeld)), `${t.sleutel}: ${soort} ontbreekt in public/seizoenen`);
    }
  }
  // De logoprompt vult het thema in en vraagt om twee logo's met de drie vaste figuren; losse prompts vragen er één
  const logos = logoPrompt("Bier en wandelen");
  assert.ok(logos.includes("## THEMA: Bier en wandelen") && !logos.includes(THEMA_INVUL));
  assert.ok(logos.includes("TWEE LOSSE AFBEELDINGEN") && logos.includes("GELE BANAAN") && logos.includes("PAARS SPOOKJE") && logos.includes("ZWARTE BOM"));
  assert.ok(logoBreedPrompt("Kerst").includes("ALLEEN OUTPUT 1") && logoVierkantPrompt("Kerst").includes("ALLEEN OUTPUT 2"));
  for (const tekst of [achtergrondPrompt("Kerst"), achtergrondPromptGemini("Kerst")]) assert.ok(tekst.includes("Kerst") && tekst.includes("9:16"));
  assert.equal(LOGO_REFERENTIES.length, 2);
  for (const b of [...LOGO_REFERENTIES, ACHTERGROND_VOORBEELD]) assert.ok(fs.existsSync(path.join("public", b.bestand)), `bijlage ${b.bestand} ontbreekt`);
  // Een spel houdt zijn eigen thema; zonder bewaard thema telt de datum van het spel, niet die van vandaag
  assert.equal(spelThema({ thema: "kerst", started_at: "2026-06-01T10:00:00Z" }), "kerst");
  assert.equal(spelThema({ started_at: "2026-12-20T10:00:00Z" }), "kerst");
  assert.equal(spelThema({ thema: "bestaatniet", started_at: "2026-07-01T10:00:00Z" }), "zomer");
  assert.equal(spelLogo("vierkant.webp", "kerst"), "/spellogo/vierkant.webp?thema=kerst");
  for (const k of Object.keys(FINISH_THEMAS) as (keyof typeof FINISH_THEMAS)[]) assert.ok(!/NaN|undefined/.test(themaAchtergrond(k)), `kleuren van ${k} kloppen niet`);
  // Rond middernacht telt de Nederlandse dag, ook op een server in UTC: 23 okt 22:30 UTC is in Nederland al 24 okt
  const dag = nederlandseDag(new Date(Date.UTC(2026, 9, 23, 22, 30)));
  assert.deepEqual([dag.getFullYear(), dag.getMonth(), dag.getDate()], [2026, 9, 24]);
  assert.equal(huidigFinishThema(new Date(Date.UTC(2026, 9, 23, 22, 30))), "halloween");
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
