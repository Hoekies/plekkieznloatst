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
// Sinds 28-10-2026 zijn deze gebreken gerepareerd: de proeven bewaken nu het gewenste gedrag (OPGELOST).
const bevestigd = (tekst) => { resultaten.push(tekst); console.log(`OPGELOST: ${tekst}`); };

(async () => {
  const velden = { type: 'open', tekst: 'Hoe heet deze plek?', vraagAfbeelding: null, punten: 65, antwoorden: [], openAntwoorden: 'Molen', numeriekeWaarde: '', tolerantie: '0', isNumeriek: false, naam: 'Bestaande naam', geluidPad: null, tijdslimiet: null };
  const oud = waarde(vraagEditor, 'huidig', velden);
  velden.geluidPad = 'geluid.mp3'; velden.tijdslimiet = 30;
  assert.notEqual(waarde(vraagEditor, 'huidig', velden), oud);
  velden.geluidPad = null; velden.tijdslimiet = null;
  bevestigd('Geluid/tijdslimiet wijzigen telt mee als niet-opgeslagen wijziging (E06).');

  const punten = [{ id: 'start', name: 'Start', type: 'informatiepunt', latitude: 52, longitude: 5 }, { id: 'a', name: 'Vraag A', type: 'vraagpunt' }, { id: 'b', name: 'Vraag B', type: 'vraagpunt' }, { id: 'eind', name: 'Finish', type: 'eindpunt' }];
  const ids = waarde(editor, 'alleVragenPunten', { punten, route: { modus: 'verspreid' } }).map((p) => p.id);
  assert.deepEqual(Array.from(ids), ['start', 'a', 'b', 'eind']);
  let si = 0, states = [], opgeslagen = 0, gesloten = 0, bewaard = [], effecten = [];
  const useState = (init) => { const i = si++; if (!(i in states)) states[i] = typeof init === 'function' ? init() : init; return [states[i], (v) => { states[i] = typeof v === 'function' ? v(states[i]) : v; }]; };
  const puntForm = functie('components/admin/editor/Formulieren.tsx', 'PuntForm', { useState, useEffect: (fn) => { effecten.push(fn); }, useRef: (v) => ({ current: v }), NaamKiezer: dummy, Icoon: dummy });
  const p = { punt: punten[0], opslaan: false, fout: '', heeftVraag: false, naamWoorden: [], onVraag: () => {}, onOpslaan: () => opgeslagen++, onSluit: () => gesloten++, onVerwijder: () => {}, onBewaarBijSluiten: (pt, u) => { bewaard.push([pt.id, u]); } };
  let tree = puntForm.fn(p);
  assert.equal(nodes(tree).filter((n) => n.props.onClick === p.onVraag).length, 1);
  bevestigd('Startvraag en finishopdracht staan in Alle vragen; het infopuntpaneel heeft een knop Vraag toevoegen (E01).');

  nodes(tree).find((n) => n.type === 'textarea').props.onChange({ target: { value: 'Nieuwe instructie' } });
  si = 0; effecten = []; tree = puntForm.fn(p);
  assert.equal(nodes(tree).find((n) => n.type === 'textarea').props.value, 'Nieuwe instructie');
  nodes(tree).find((n) => n.type === 'button' && n.props['aria-label'] === 'Sluiten').props.onClick();
  // Sluiten = het paneel verdwijnt: de opruimfuncties van de effecten draaien
  effecten.map((fn) => fn()).filter((x) => typeof x === 'function').forEach((opruimen) => opruimen());
  assert.equal(gesloten, 1); assert.equal(bewaard.length, 1); assert.equal(bewaard[0][1].description, 'Nieuwe instructie');
  bevestigd('Puntpaneel sluiten met een gewijzigde tekst bewaart die tekst vanzelf (E05).');

  const meldingen0 = [];
  const geladen = functie(editor, 'openVraag', { route: { id: 'route' }, api: async () => new Response('{"fout":"Tijdelijk niet beschikbaar"}', { status: 500 }), setVraagVenster: (v) => { geladen.ctx.venster = v; }, toonMelding: (...m) => meldingen0.push(m) });
  await geladen.fn(punten[1]); assert.equal(geladen.ctx.venster, undefined); assert.equal(meldingen0[0][1], 'fout');
  bevestigd('HTTP 500 bij vraag laden opent geen leeg formulier maar geeft een melding (E03).');

  const meldingen1 = [];
  const undo = functie(editor, 'maakOngedaan', { stappen: [{ soort: 'punt-gewijzigd', id: 'a', oud: { name: 'Oud' } }], bezigMetHerstel: false, route: { id: 'route' }, los: (x) => x, api: async () => new Response('{}', { status: 503 }), setBezigMetHerstel: () => {}, setHerstelToast: () => {}, setStappen: (f) => { undo.ctx.stappen = f(undo.ctx.stappen); }, setPunten: () => {}, setGeselecteerd: () => {}, toonMelding: (...m) => meldingen1.push(m), stapLabel: () => 'punt gewijzigd' });
  await undo.fn(); assert.equal(undo.ctx.stappen.length, 1); assert.equal(meldingen1[0][1], 'fout');
  bevestigd('Mislukte undo houdt de herstelstap, zodat opnieuw proberen kan (E04).');

  let aantalApi = 0;
  const maak = functie(editor, 'genereerPuntenInCirkel', { centrumPunt: { lat: 52, lng: 5 }, doelAfstandKm: 1, aantalPunten: 2, cirkelDraai: 0, punten: [], route: { id: 'route' }, finishPunt: null, puntenOpCirkel: () => [], opDeWeg: async () => [], setPunten: () => {}, setGeselecteerd: () => {}, toonMelding: () => {}, api: async () => { aantalApi++; return new Response('{}', { status: 500 }); } });
  let stap = 3;
  let wsi = 0; const wStates = [];
  const wUseState = (init) => { const i = wsi++; if (!(i in wStates)) wStates[i] = init; return [wStates[i], (v) => { wStates[i] = typeof v === 'function' ? v(wStates[i]) : v; }]; };
  const wizard = functie('components/admin/editor/EersteStappen.tsx', 'EersteStappen', { Icoon: dummy, useState: wUseState });
  const w = wizard.fn({ modus: 'verspreid', stap: 3, aantal: 2, aantalPunten: 0, onMaakPunten: maak.fn, onStap: (n) => { stap = n; }, onKies: () => {}, onZoek: () => {} });
  await nodes(w).find((n) => n.type === 'button' && String(n.props.className).includes('es-hoofd')).props.onClick();
  assert.ok(aantalApi > 0); assert.equal(stap, 3);
  bevestigd('Wizard blijft op Voorbeeld als het maken van de punten mislukt (E07).');

  let verwijderd = [];
  const opnieuw = functie(editor, 'genereerPuntenInCirkel', { centrumPunt: { lat: 52, lng: 5 }, doelAfstandKm: 1, aantalPunten: 2, cirkelDraai: 0, punten, route: { id: 'route' }, finishPunt: null, puntenOpCirkel: () => [{ lat: 52.1, lng: 5.1 }], opDeWeg: async (v) => v, setPunten: () => {}, setGeselecteerd: () => {}, toonMelding: () => {}, api: async (url, opt) => { if (opt.method === 'DELETE') { verwijderd.push(url); return new Response('{}'); } return new Response(JSON.stringify({ id: 'nieuw', ...JSON.parse(opt.body) })); } });
  wsi = 0;
  const w2 = wizard.fn({ modus: 'verspreid', stap: 3, aantal: 2, aantalPunten: 4, metVraag: 2, onMaakPunten: opnieuw.fn, onStap: () => {}, onKies: () => {}, onZoek: () => {} });
  await nodes(w2).find((n) => n.type === 'button' && String(n.props.className).includes('es-hoofd')).props.onClick();
  assert.equal(verwijderd.length, 0);
  const extra = nodes(w2).find((n) => n.type === 'button' && String(n.props.className).includes('es-extra'));
  extra.props.onClick(); wsi = 0;
  const w3 = wizard.fn({ modus: 'verspreid', stap: 3, aantal: 2, aantalPunten: 4, metVraag: 2, onMaakPunten: opnieuw.fn, onStap: () => {}, onKies: () => {}, onZoek: () => {} });
  assert.ok(nodes(w3).some((n) => n.props.className === 'es-let-op'));
  bevestigd('Opnieuw maken in de wizard vraagt eerst om bevestiging en noemt de vragen die weggaan (E02).');

  let meldingen = [], geprobeerd = 0;
  const item = functie(editor, 'voegSpeciaalItemToeOp', { route: { id: 'route' }, itemRadius: 15, itemsOpWeg: true, api: async () => { geprobeerd++; return new Response('{}', { status: 503 }); } });
  const items = functie(editor, 'plaatsAlleVoorstellen', { itemCheck: { voorstellen: [{ lat: 1, lng: 2, type: 'ster' }, { lat: 2, lng: 3, type: 'bom' }] }, setAutoItemsBezig: () => {}, voegSpeciaalItemToeOp: item.fn, toonMelding: (...m) => { meldingen.push(m); } });
  assert.equal(await items.fn(), false); assert.equal(geprobeerd, 2); assert.equal(meldingen[0][1], 'fout'); assert.ok(meldingen[0][0].includes('0 van 2'));
  bevestigd('Itemplaatsing meldt hoeveel er echt zijn geplaatst (E08).');

  let naamDialoog = false, netwerk = 0;
  const save = functie(vraagEditor, 'slaOp', { ...velden, punt: { name: 'Bestaande naam', type: 'vraagpunt' }, type: 'foto_opdracht', setFout: () => {}, setOpslaan: () => {}, setNaamVenster: (v) => { naamDialoog = v; }, geluidPad: null, tijdslimiet: null, foutUitleg: async () => 'fout', routeId: 'route', fetch: async () => { netwerk++; throw Error('geen netwerk in de proef'); } });
  await save.fn(undefined, false); assert.equal(naamDialoog, false); assert.ok(netwerk > 0);
  bevestigd('Opslaan bij een bestaande, bewust gekozen puntnaam slaat meteen op zonder naamvraag (E09).');

  console.log(`\n${resultaten.length} lokale controles afgerond. Geen echte netwerkverzoeken uitgevoerd.`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
