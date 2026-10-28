// Lokale auditproeven: voert bronfuncties geïsoleerd uit. Geen echte API- of databaseverzoeken.
// Uitvoeren vanuit de projectmap: node docs/audit-editor-gebruik/proeven.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const editor = 'components/admin/RouteEditorShell.tsx';
const vraagEditor = 'components/admin/VraagEditorPagina.tsx';
function zoek(pad, naam, soort) {
  const sf = ts.createSourceFile(pad, fs.readFileSync(path.join(root, pad), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let node;
  function loop(n) {
    if (!node && ((soort === 'functie' && ts.isFunctionDeclaration(n)) || (soort === 'variabele' && ts.isVariableDeclaration(n))) && n.name?.getText(sf) === naam) node = n;
    ts.forEachChild(n, loop);
  }
  loop(sf);
  if (!node) throw Error(`Bron niet gevonden: ${pad} / ${naam}`);
  return { sf, node };
}
const jsx = (type, props, key) => ({ type, props: props || {}, key });
function functie(pad, naam, globals = {}) {
  const { sf, node } = zoek(pad, naam, 'functie');
  const bron = node.getText(sf).replace(/^export default /, '').replace(/^export /, '');
  const ctx = { exports: {}, Response, Date, Set, Map, Math, JSON, console,
    require: (n) => { if (n === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' }; throw Error(`Onverwachte import: ${n}`); },
    ...globals };
  vm.createContext(ctx);
  vm.runInContext(ts.transpileModule(`exports.fn = ${bron}`, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, ctx);
  return { fn: ctx.exports.fn, ctx };
}
function waarde(pad, naam, globals) {
  const { sf, node } = zoek(pad, naam, 'variabele');
  return vm.runInNewContext(node.initializer.getText(sf), { JSON, Set, Map, ...globals });
}
function nodes(n, uit = []) {
  if (Array.isArray(n)) n.forEach((x) => nodes(x, uit));
  else if (n && typeof n === 'object' && n.props) { uit.push(n); nodes(n.props.children, uit); }
  return uit;
}
const dummy = () => null;
const resultaten = [];
const bevestigd = (tekst) => { resultaten.push(tekst); console.log(`BEVESTIGD: ${tekst}`); };

(async () => {
  const velden = { type: 'open', tekst: 'Hoe heet deze plek?', vraagAfbeelding: null, punten: 65, antwoorden: [], openAntwoorden: 'Molen', numeriekeWaarde: '', tolerantie: '0', isNumeriek: false, naam: 'Bestaande naam', geluidPad: null, tijdslimiet: null };
  const oud = waarde(vraagEditor, 'huidig', velden);
  velden.geluidPad = 'geluid.mp3'; velden.tijdslimiet = 30;
  assert.equal(waarde(vraagEditor, 'huidig', velden), oud);
  bevestigd('Geluid/tijdslimiet wijzigen verandert de niet-opgeslagen-vergelijking niet.');

  const punten = [{ id: 'start', name: 'Start', type: 'informatiepunt', latitude: 52, longitude: 5 }, { id: 'a', name: 'Vraag A', type: 'vraagpunt' }, { id: 'b', name: 'Vraag B', type: 'vraagpunt' }, { id: 'eind', name: 'Finish', type: 'eindpunt' }];
  const ids = waarde(editor, 'vraagpunten', { punten }).map((p) => p.id);
  assert.deepEqual(Array.from(ids), ['a', 'b']);
  const controle = functie('lib/route-controle.ts', 'routeControle').fn({ punten, modus: 'verspreid', vraagPuntIds: new Set(ids), verwachtTeams: 2, itemTekort: 0, itemTeVeel: false, teamAanloopM: [], teamMinuten: [] });
  assert.ok(controle.some((r) => r.niveau === 'fout' && r.tekst.includes('startpunt')));
  let si = 0, states = [], opgeslagen = 0, gesloten = 0;
  const useState = (init) => { const i = si++; if (!(i in states)) states[i] = typeof init === 'function' ? init() : init; return [states[i], (v) => { states[i] = typeof v === 'function' ? v(states[i]) : v; }]; };
  const puntForm = functie('components/admin/editor/Formulieren.tsx', 'PuntForm', { useState, useEffect: () => {}, NaamKiezer: dummy, Icoon: dummy });
  const p = { punt: punten[0], opslaan: false, fout: '', heeftVraag: false, naamWoorden: [], onVraag: () => {}, onOpslaan: () => opgeslagen++, onSluit: () => gesloten++, onVerwijder: () => {} };
  let tree = puntForm.fn(p);
  assert.equal(nodes(tree).filter((n) => n.props.onClick === p.onVraag).length, 0);
  bevestigd('Verplichte startvraag ontbreekt in Alle vragen; het infopuntpaneel heeft ook geen knop om die vraag toe te voegen.');

  nodes(tree).find((n) => n.type === 'textarea').props.onChange({ target: { value: 'Nieuwe instructie' } });
  si = 0; tree = puntForm.fn(p);
  assert.equal(nodes(tree).find((n) => n.type === 'textarea').props.value, 'Nieuwe instructie');
  nodes(tree).find((n) => n.type === 'button' && n.props['aria-label'] === 'Sluiten').props.onClick();
  assert.equal(opgeslagen, 0); assert.equal(gesloten, 1);
  bevestigd('Puntpaneel sluit na tekstwijziging zonder opslaan of eigen waarschuwing.');

  const geladen = functie(editor, 'openVraag', { route: { id: 'route' }, api: async () => new Response('{"fout":"Tijdelijk niet beschikbaar"}', { status: 500 }), setVraagVenster: (v) => { geladen.ctx.venster = v; } });
  await geladen.fn(punten[1]); assert.equal(geladen.ctx.venster.vraag, null);
  bevestigd('HTTP 500 bij vraag laden wordt een lege bewerkbare vraag.');

  const undo = functie(editor, 'maakOngedaan', { stappen: [{ soort: 'punt-gewijzigd', id: 'a', oud: { name: 'Oud' } }], bezigMetHerstel: false, route: { id: 'route' }, los: (x) => x, api: async () => new Response('{}', { status: 503 }), setBezigMetHerstel: () => {}, setHerstelToast: () => {}, setStappen: (f) => { undo.ctx.stappen = f(undo.ctx.stappen); } });
  await undo.fn(); assert.equal(undo.ctx.stappen.length, 0);
  bevestigd('Mislukte undo met HTTP 503 verwijdert de herstelstap uit de geschiedenis.');

  let aantalApi = 0;
  const maak = functie(editor, 'genereerPuntenInCirkel', { centrumPunt: { lat: 52, lng: 5 }, doelAfstandKm: 1, aantalPunten: 2, cirkelDraai: 0, punten: [], route: { id: 'route' }, finishPunt: null, puntenOpCirkel: () => [], opDeWeg: async () => [], setPunten: () => {}, setGeselecteerd: () => {}, api: async () => { aantalApi++; return new Response('{}', { status: 500 }); } });
  let stap = 3;
  const wizard = functie('components/admin/editor/EersteStappen.tsx', 'EersteStappen', { Icoon: dummy });
  const w = wizard.fn({ modus: 'verspreid', stap: 3, aantal: 2, aantalPunten: 0, onMaakPunten: maak.fn, onStap: (n) => { stap = n; }, onKies: () => {}, onZoek: () => {} });
  await nodes(w).find((n) => n.type === 'button' && String(n.props.className).includes('es-hoofd')).props.onClick();
  assert.ok(aantalApi > 0); assert.equal(stap, 4);
  bevestigd('Wizard gaat naar Items nadat alle aanvragen voor nieuwe routepunten mislukken.');

  let verwijderd = [], bevestigingen = 0, undoOpgeslagen = 0, nieuwNr = 0;
  const opnieuw = functie(editor, 'genereerPuntenInCirkel', { centrumPunt: { lat: 52, lng: 5 }, doelAfstandKm: 1, aantalPunten: 2, cirkelDraai: 0, punten, route: { id: 'route' }, finishPunt: null, puntenOpCirkel: () => [{ lat: 52.1, lng: 5.1 }], opDeWeg: async (v) => v, setPunten: () => {}, setGeselecteerd: () => {}, confirm: () => { bevestigingen++; return true; }, onthoud: () => { undoOpgeslagen++; }, api: async (url, opt) => { if (opt.method === 'DELETE') { verwijderd.push(url); return new Response('{}'); } return new Response(JSON.stringify({ id: `nieuw${nieuwNr++}`, ...JSON.parse(opt.body) })); } });
  const w2 = wizard.fn({ modus: 'verspreid', stap: 3, aantal: 2, aantalPunten: 4, onMaakPunten: opnieuw.fn, onStap: () => {}, onKies: () => {}, onZoek: () => {} });
  await nodes(w2).find((n) => n.type === 'button' && String(n.props.className).includes('es-hoofd')).props.onClick();
  assert.equal(verwijderd.length, 4); assert.equal(bevestigingen, 0); assert.equal(undoOpgeslagen, 0);
  bevestigd('Opnieuw maken in de wizard verwijdert vier bestaande punten zonder extra bevestiging of undo-opslag.');

  let meldingen = [], geprobeerd = 0;
  const item = functie(editor, 'voegSpeciaalItemToeOp', { route: { id: 'route' }, itemRadius: 15, itemsOpWeg: true, api: async () => { geprobeerd++; return new Response('{}', { status: 503 }); } });
  const items = functie(editor, 'plaatsAlleVoorstellen', { itemCheck: { voorstellen: [{ lat: 1, lng: 2, type: 'ster' }, { lat: 2, lng: 3, type: 'bom' }] }, setAutoItemsBezig: () => {}, voegSpeciaalItemToeOp: item.fn, toonMelding: (...m) => { meldingen.push(m); } });
  await items.fn(); assert.equal(geprobeerd, 2); assert.equal(meldingen[0][1], 'ok'); assert.ok(meldingen[0][0].includes('2 items geplaatst'));
  bevestigd('Itemplaatsing meldt twee geplaatste items terwijl beide aanvragen HTTP 503 geven.');

  let naamDialoog = false, netwerk = 0;
  const save = functie(vraagEditor, 'slaOp', { ...velden, punt: { name: 'Bestaande naam' }, type: 'foto_opdracht', setFout: () => {}, setOpslaan: () => {}, setNaamVenster: (v) => { naamDialoog = v; }, geluidPad: null, tijdslimiet: null, fetch: () => { netwerk++; } });
  await save.fn(undefined, false); assert.equal(naamDialoog, true); assert.equal(netwerk, 0);
  bevestigd('Opslaan bij een bestaande ongewijzigde puntnaam opent opnieuw eerst de naamdialoog.');

  console.log(`\n${resultaten.length} lokale controles afgerond. Geen echte netwerkverzoeken uitgevoerd.`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
