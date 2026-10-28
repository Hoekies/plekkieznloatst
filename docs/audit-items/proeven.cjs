// Audit met echte handlers en een lokale Supabase-simulatie. Geen netwerk of echte accounts.
// Uitvoeren: node docs/audit-items/proeven.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const kopie = (v) => v == null ? v : JSON.parse(JSON.stringify(v));
const resultaten = [];
const NU = Date.parse('2026-10-26T12:00:00Z');
function omgeving(type = 'ster', extraRoute = {}) {
  let nu = NU, actor = 'p1', nr = 100;
  const trace = [], fouten = [], willekeur = [];
  const tabellen = {
    routes: [{ id: 'r1', is_active: true, modus: 'verspreid', ster_waarde: 50, bom_waarde: 30, spook_duur_seconden: 600, plekzooi_duur_seconden: 300, item_respawn: true, respawn_minuten: 15, items_na_finish_types: [], uitslag_vrijgegeven: false, ...extraRoute }],
    players: ['p1', 'p2', 'p3'].map((id) => ({ id, auth_user_id: 'u' + id, login_name: id, nickname: id })),
    player_sessions: ['s1', 's2', 's3'].map((id, i) => ({ id, player_id: 'p' + (i + 1), route_id: 'r1', status: 'actief', score: [100, 200, 300][i], current_point_id: null, started_at: new Date(NU - 3600000).toISOString(), finished_at: null })),
    special_items: [{ id: 'item', route_id: 'r1', type, name: type, latitude: 52, longitude: 5, radius_meters: 15, points_effect: 0, claimed: true, claimed_by_session_id: 's1', claimed_at: new Date(NU - 1000).toISOString(), used_at: null, respawn_at: new Date(NU + 900000).toISOString(), is_startitem: false }],
    special_item_effects: [],
    route_points: ['start', 'a', 'b', 'eind'].map((id, i) => ({ id, route_id: 'r1', name: id, order_index: i + 1, type: i === 3 ? 'eindpunt' : i === 0 ? 'informatiepunt' : 'vraagpunt', latitude: 52 + i / 1000, longitude: 5 + i / 1000, points: 10 })),
    session_point_order: ['s1', 's2', 's3'].flatMap((session_id) => ['start', 'a', 'b', 'eind'].map((route_point_id, i) => ({ id: session_id + route_point_id, session_id, route_point_id, volgorde: i + 1 }))),
    questions: [{ id: 'q1', route_point_id: 'a', type: 'meerkeuze_tekst', points: 40, numeric_answer: null, correct_text_answers: null }],
    answer_options: [{ id: 'goed', question_id: 'q1', order_index: 1, is_correct: true, punten: null }, { id: 'fout', question_id: 'q1', order_index: 2, is_correct: false, punten: null }],
    player_point_progress: [], location_updates: [], foto_inzendingen: [], item_log: [], broadcasts: [], hulpverzoeken: []
  };
  class AuditDate extends Date { constructor(...a) { super(...(a.length ? a : [nu])); } static now() { return nu; } }
  const math = Object.create(Math); math.random = () => willekeur.length ? willekeur.shift() : 0.1;
  const veld = (rij, k) => k.split('.').reduce((v, deel) => v?.[deel], rij);
  const voegRelatiesToe = (t, rij) => {
    const r = kopie(rij);
    if (t === 'questions') { r.answer_options = kopie(tabellen.answer_options.filter((a) => a.question_id === r.id)); r.route_points = kopie(tabellen.route_points.find((p) => p.id === r.route_point_id)); }
    if (t === 'player_sessions') r.players = kopie(tabellen.players.find((p) => p.id === r.player_id));
    if (t === 'player_point_progress') r.player_sessions = kopie(tabellen.player_sessions.find((p) => p.id === r.session_id));
    return r;
  };
  function vergelijk(r, f) {
    const [op, k, v, extra] = f, x = veld(r, k);
    if (op === 'eq') return x === v;
    if (op === 'neq') return x !== v;
    if (op === 'is') return v === null ? x == null : x === v;
    if (op === 'in') return v.includes(x);
    if (op === 'gt') return x != null && x > v;
    if (op === 'gte') return x != null && x >= v;
    if (op === 'lte') return x != null && x <= v;
    if (op === 'not' && v === 'is') return extra === null ? x != null : x !== extra;
    if (op === 'not' && v === 'in') return !extra.slice(1, -1).split(',').includes(x);
    if (op === 'or') return k.split(',').some((s) => { const [col, o, z] = s.split('.'); return vergelijk(r, [o, col, z === 'true' ? true : z === 'false' ? false : z]); });
    throw Error('Niet ondersteund filter: ' + JSON.stringify(f));
  }
  function uniek(t, rows) {
    const sleutels = t === 'special_item_effects' ? [['special_item_id', 'target_session_id']]
      : t === 'session_point_order' ? [['session_id', 'route_point_id'], ['session_id', 'volgorde']]
      : ['player_point_progress', 'foto_inzendingen'].includes(t) ? [['session_id', 'route_point_id']] : [];
    for (const velden of sleutels) {
      const gezien = new Set();
      for (const r of rows) { const key = JSON.stringify(velden.map((k) => r[k])); if (gezien.has(key)) return { code: '23505', message: `UNIQUE ${t} (${velden.join(', ')})` }; gezien.add(key); }
    }
    return null;
  }
  const admin = { from(t) {
    if (!tabellen[t]) throw Error('Onbekende tabel: ' + t);
    const q = { tabel: t, op: 'select', filters: [], orders: [], limiet: Infinity, offset: 0, count: false, head: false };
    const b = {};
    for (const m of ['eq', 'neq', 'in', 'is', 'gt', 'gte', 'lte', 'not', 'or']) b[m] = (...a) => { q.filters.push([m, ...a]); return b; };
    b.select = (tekst, opties = {}) => { q.select = tekst; q.count = !!opties.count; q.head = !!opties.head; return b; };
    for (const m of ['update', 'insert', 'delete']) b[m] = (v) => { q.op = m; q.values = v; return b; };
    // upsert (na de reparaties): bestaande rij met dezelfde conflictsleutels bijwerken, anders invoegen
    b.upsert = (v, opties = {}) => { q.op = 'upsert'; q.values = v; q.conflict = (opties.onConflict ?? 'id').split(','); return b; };
    b.order = (k, opties = {}) => { q.orders.push([k, opties.ascending !== false]); return b; };
    b.limit = (n) => { q.limiet = n; return b; };
    b.range = (a, z) => { q.offset = a; q.limiet = z - a + 1; return b; };
    function run(single) {
      trace.push(kopie(q));
      if (fouten.length && fouten[0].tabel === t && fouten[0].op === q.op) { const f = fouten.shift(); return { data: null, count: null, error: { code: f.code ?? 'AUDIT', message: f.message ?? 'Gesimuleerde databasefout' } }; }
      const lijst = tabellen[t];
      let indices = lijst.map((r, i) => i).filter((i) => q.filters.every((f) => vergelijk(voegRelatiesToe(t, lijst[i]), f)));
      if (t === 'player_point_progress' && /questions!inner/.test(q.select ?? '')) indices = indices.filter((i) => tabellen.questions.some((v) => v.route_point_id === lijst[i].route_point_id));
      let rows;
      if (q.op === 'select') rows = indices.map((i) => lijst[i]);
      else {
        let nieuw = lijst.map((r) => kopie(r));
        if (q.op === 'upsert') {
          rows = [];
          for (const r of (Array.isArray(q.values) ? q.values : [q.values])) {
            const i = nieuw.findIndex((x) => q.conflict.every((k) => x[k] === r[k]));
            if (i >= 0) { Object.assign(nieuw[i], kopie(r)); rows.push(nieuw[i]); }
            else { const rij = { id: 'rij' + nr++, created_at: new AuditDate().toISOString(), applied_at: new AuditDate().toISOString(), ...kopie(r) }; nieuw.push(rij); rows.push(rij); }
          }
        } else if (q.op === 'insert') {
          rows = (Array.isArray(q.values) ? q.values : [q.values]).map((r) => ({ id: 'rij' + nr++, created_at: new AuditDate().toISOString(), applied_at: new AuditDate().toISOString(), ...kopie(r) }));
          nieuw.push(...rows);
        } else if (q.op === 'update') { for (const i of indices) Object.assign(nieuw[i], kopie(q.values)); rows = indices.map((i) => nieuw[i]); }
        else { rows = indices.map((i) => nieuw[i]); nieuw = nieuw.filter((_, i) => !indices.includes(i)); }
        const error = uniek(t, nieuw);
        if (error) return { data: null, count: null, error };
        tabellen[t] = nieuw;
      }
      rows = rows.map((r) => voegRelatiesToe(t, r));
      const count = rows.length;
      for (const [k, asc] of q.orders.slice().reverse()) rows.sort((a, b) => veld(a, k) === veld(b, k) ? 0 : (veld(a, k) > veld(b, k) ? 1 : -1) * (asc ? 1 : -1));
      rows = rows.slice(q.offset, q.offset + q.limiet);
      if (single && rows.length > 1) return { data: null, count: q.count ? count : null, error: { code: 'PGRST116', message: 'JSON object requested, multiple rows returned' } };
      return { data: q.head ? null : single ? rows[0] ?? null : rows, count: q.count ? count : null, error: null };
    }
    b.then = (ok, fout) => Promise.resolve().then(() => run(false)).then(ok, fout);
    b.maybeSingle = b.single = () => Promise.resolve().then(() => run(true));
    return b;
  } };
  admin.storage = { from: () => ({ upload: async () => ({ error: null }), remove: async () => ({ error: null }) }) };
  // Databasefuncties uit migratie 002 (lib/score.ts). Een gesimuleerde fout op player_sessions/update (of
  // session_point_order/update bij ruilen) laat ook deze aanroep mislukken, net als vroeger de losse update.
  admin.rpc = async (naam, a) => {
    const tabel = naam === 'pr_punten_ruilen' ? 'session_point_order' : 'player_sessions';
    trace.push({ tabel, op: 'rpc', naam, args: kopie(a) });
    if (fouten.length && fouten[0].tabel === tabel && fouten[0].op === 'update') { const f = fouten.shift(); return { data: null, error: { code: f.code ?? 'AUDIT', message: f.message ?? 'Gesimuleerde databasefout' } }; }
    const s = (id) => tabellen.player_sessions.find((x) => x.id === id);
    if (naam === 'pr_score_bij') { const x = s(a.p_sessie); if (!x) return { data: null, error: null }; x.score += a.p_delta; return { data: x.score, error: null }; }
    if (naam === 'pr_score_wissel') { const x = s(a.p_a), y = s(a.p_b); if (!x || !y) return { data: null, error: { message: 'Sessie niet gevonden' } }; [x.score, y.score] = [y.score, x.score]; return { data: null, error: null }; }
    if (naam === 'pr_score_overboeken') { const x = s(a.p_van), y = s(a.p_naar); if (!x || !y) return { data: null, error: { message: 'Sessie niet gevonden' } }; const n = Math.max(0, Math.min(a.p_max, x.score)); x.score -= n; y.score += n; return { data: n, error: null }; }
    if (naam === 'pr_punten_ruilen') { const rij = (v) => tabellen.session_point_order.find((r) => r.session_id === a.p_sessie && r.volgorde === v); const x = rij(a.p_volgorde_a), y = rij(a.p_volgorde_b); if (!x || !y) return { data: null, error: { message: 'Punt niet gevonden' } }; [x.volgorde, y.volgorde] = [y.volgorde, x.volgorde]; return { data: null, error: null }; }
    return { data: null, error: { code: 'PGRST202', message: 'Could not find the function ' + naam } };
  };
  const cache = new Map();
  function laad(pad) {
    let p = pad.startsWith('@/') ? path.join(root, pad.slice(2)) : path.resolve(root, pad);
    if (!path.extname(p)) p += '.ts';
    if (cache.has(p)) return cache.get(p);
    const exports = {}; cache.set(p, exports);
    const local = (n) => {
      if (n === 'next/server') return { NextResponse: { json: (v, o) => new Response(JSON.stringify(v), { status: o?.status ?? 200 }) } };
      if (n === '@/lib/auth-server') return { haalGebruiker: async () => ({ id: 'u' + actor }), isBeheer: () => true };
      if (n === '@/lib/supabase-admin') return { createAdminClient: () => admin };
      if (n === '@/lib/push') return { stuurPushNaarBeheer: async () => {} };
      if (n === 'next/headers') return { cookies: () => ({ get: () => undefined }) };
      if (n.startsWith('@/')) return laad(n);
      if (n.startsWith('.')) return laad(path.resolve(path.dirname(p), n));
      throw Error('Onverwachte import: ' + n);
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(p, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
      { exports, require: local, Date: AuditDate, Math: math, Response, Buffer, Set, Map, console, atob }, { filename: p });
    return exports;
  }
  const req = (body) => ({ json: async () => body });
  const effect = (doel = 's2', item = 'item') => laad('app/api/speler/speciaal/effect/route.ts').POST(req({ special_item_id: item, target_session_id: doel }));
  const claim = (item = 'item') => laad('app/api/speler/speciaal/claim/route.ts').POST(req({ special_item_id: item, latitude: 52, longitude: 5 }));
  const sessie = (id = 's1') => tabellen.player_sessions.find((s) => s.id === id);
  const item = (id = 'item') => tabellen.special_items.find((s) => s.id === id);
  const bereikt = () => tabellen.player_point_progress.push({ id: 'voortgang', session_id: 's1', route_point_id: 'a', reached_at: new AuditDate().toISOString(), answered_at: null, points_awarded: 0, selected_answer_id: null });
  const antwoord = (id = 'goed') => laad('app/api/speler/voortgang/verwerk/route.ts').POST(req({ route_point_id: 'a', selected_answer_id: id }));
  const extraItem = (type, id) => tabellen.special_items.push({ ...kopie(item()), id, type, used_at: null });
  return { tabellen, admin, trace, fouten, willekeur, laad, req, effect, claim, sessie, item, bereikt, antwoord, extraItem, actor: (a) => { actor = a; }, tijd: (n) => { nu = n; } };
}
async function test(naam, run) {
  try { await run(); resultaten.push({ naam, geslaagd: true }); console.log('OK: ' + naam); }
  catch (e) { resultaten.push({ naam, geslaagd: false, fout: e.message }); console.log('MISLUKT: ' + naam + ' — ' + e.message.split('\n')[0]); process.exitCode = 1; }
}

// Haal een echte clientfunctie op zonder een kaart, GPS of React-browseromgeving te starten.
function clientFunctie(naam, globals) {
  const bestand = path.join(root, 'components/speler/SpelerKaart.tsx');
  const sf = ts.createSourceFile(bestand, fs.readFileSync(bestand, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let fn;
  function zoek(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === naam) fn = n; ts.forEachChild(n, zoek); }
  zoek(sf);
  if (!fn) throw Error('Clientfunctie niet gevonden: ' + naam);
  const ctx = { exports: {}, Set, Date, ...globals };
  vm.runInNewContext(ts.transpileModule('exports.fn = ' + fn.getText(sf), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, ctx);
  return ctx.exports.fn;
}

(async () => {
  const e0 = omgeving('ster');
  await test('Ster: enkel gebruik geeft routebonus en verbruikt item', async () => { const e = omgeving('ster'); assert.equal((await e.effect()).status, 200); assert.equal(e.sessie().score, 150); assert.ok(e.item().used_at); });
  await test('Bom: routewaarde wordt afgetrokken, ook onder nul', async () => { const e = omgeving('bom'); e.sessie('s2').score = 10; assert.equal((await e.effect()).status, 200); assert.equal(e.sessie('s2').score, -20); });
  await test('Wissel: twee scores worden bij enkel gebruik omgewisseld', async () => { const e = omgeving('wissel'); await e.effect(); assert.equal(e.sessie().score, 200); assert.equal(e.sessie('s2').score, 100); });
  await test('Dief: laatste positieve goede vraag wordt direct overgeboekt', async () => { const e = omgeving('dief'); e.tabellen.player_point_progress.push({ id: 'goed2', session_id: 's2', route_point_id: 'a', is_correct: true, points_awarded: 60, answered_at: new Date(NU).toISOString() }); await e.effect(); assert.equal(e.sessie().score, 160); assert.equal(e.sessie('s2').score, 140); });
  await test('Dief: buit wordt begrensd op beschikbare punten', async () => { const e = omgeving('dief'); e.sessie('s2').score = 15; await e.effect(); assert.equal(e.sessie().score, 115); assert.equal(e.sessie('s2').score, 0); });
  await test('Spook: effect duurt ingestelde 600 seconden', async () => { const e = omgeving('spook'); await e.effect(); assert.equal(Date.parse(e.tabellen.special_item_effects[0].expires_at) - NU, 600000); });
  await test('Radar: effect duurt 120 seconden', async () => { const e = omgeving('radar'); await e.effect(); assert.equal(Date.parse(e.tabellen.special_item_effects[0].expires_at) - NU, 120000); });
  await test('Verdubbeling: gewone goede vraag geeft 80 in plaats van 40', async () => { const e = omgeving('verdubbeling'); await e.effect(); e.bereikt(); assert.equal((await e.antwoord()).status, 200); assert.equal(e.sessie().score, 180); assert.equal(e.tabellen.special_item_effects.length, 0); });
  await test('Verdubbeling: nul en minpunten verbruiken effect niet', async () => { const e = omgeving('verdubbeling'); await e.effect(); e.bereikt(); e.tabellen.answer_options.find((o) => o.id === 'fout').punten = -10; await e.antwoord('fout'); assert.equal(e.sessie().score, 90); assert.equal(e.tabellen.special_item_effects.length, 1); });
  await test('Verdubbeling: fout antwoord met nul punten bewaart het effect', async () => { const e = omgeving('verdubbeling'); await e.effect(); e.bereikt(); await e.antwoord('fout'); assert.equal(e.sessie().score, 100); assert.equal(e.tabellen.special_item_effects.length, 1); });
  await test('Plek zooi: eerste aanraking blokkeert 300 seconden; val blijft liggen', async () => { const e = omgeving('plekzooi'); e.item().claimed = false; e.item().claimed_by_session_id = null; const r = await (await e.claim()).json(); assert.equal(r.status, 'plekzooi'); assert.equal(Date.parse(r.expires_at) - NU, 300000); assert.equal(e.item().claimed, false); });
  await test('Plek zooi: eenmaal per team; een ander team kan dezelfde val raken', async () => { const e = omgeving('plekzooi'); await e.claim(); e.tijd(NU + 301000); assert.equal((await (await e.claim()).json()).status, 'al_gehad'); e.actor('p2'); assert.equal((await (await e.claim()).json()).status, 'plekzooi'); });
  for (const [roll, score] of [[0.1, 200], [0.65, 350], [0.75, -100], [0.9, 50]]) await test('Vraagteken: worp ' + roll + ' resulteert in eigen score ' + score, async () => { const e = omgeving('vraagteken'); e.willekeur.push(roll); await e.effect(); assert.equal(e.sessie().score, score); });
  await test('Vraagteken: groepsworp geeft andere teams elk plus of min 50', async () => { const e = omgeving('vraagteken'); e.willekeur.push(0.5, 0.1, 0.9); await e.effect(); assert.equal(e.sessie().score, 100); assert.equal(e.sessie('s2').score, 250); assert.equal(e.sessie('s3').score, 250); });
  await test('Eigen team, ander route-id en vreemd eigendom worden geweigerd', async () => { const e = omgeving('bom'); assert.equal((await e.effect('s1')).status, 400); e.sessie('s2').route_id = 'anders'; assert.equal((await e.effect()).status, 400); e.item().claimed_by_session_id = 's3'; assert.equal((await e.effect()).status, 403); });
  await test('Pauze blokkeert inzetten en oppakken', async () => { const e = omgeving('bom', { gepauzeerd_sinds: new Date(NU).toISOString() }); assert.equal((await e.effect()).status, 409); assert.equal((await e.claim()).status, 409); });
  await test('Na finish: toegestane bom werkt, ster niet; vrijgave stopt inzet', async () => { const e = omgeving('bom', { items_na_finish_types: ['bom'] }); Object.assign(e.sessie(), { status: 'voltooid', finished_at: new Date(NU).toISOString() }); assert.equal((await e.effect()).status, 200); e.item().type = 'ster'; e.item().used_at = null; assert.equal((await e.effect()).status, 400); e.tabellen.routes[0].uitslag_vrijgegeven = true; assert.equal((await e.effect()).status, 403); });
  await test('Gefinisht doelteam: bom alleen als toegestaan; spook wordt geweigerd', async () => { const e = omgeving('bom', { items_na_finish_types: ['bom', 'spook'] }); e.sessie('s2').status = 'voltooid'; assert.equal((await e.effect()).status, 200); e.extraItem('spook', 'spook2'); assert.equal((await e.effect('s2', 'spook2')).status, 400); });
  await test('Sequentieel: gewone kaartitems niet claimbaar, plek zooi wel', async () => { const e = omgeving('ster', { modus: 'sequentieel' }); e.item().claimed = false; e.item().claimed_by_session_id = null; assert.equal((await (await e.claim()).json()).status, 'al_geclaimd'); e.item().type = 'plekzooi'; assert.equal((await (await e.claim()).json()).status, 'plekzooi'); });
  await test('Claim is atomair: twee teams krijgen niet hetzelfde item', async () => { const e = omgeving('bom'); e.item().claimed = false; e.item().claimed_by_session_id = null; const a = e.claim(); e.actor('p2'); const b = e.claim(); const r = await Promise.all([a, b]); const s = await Promise.all(r.map((x) => x.json())); assert.equal(s.filter((x) => x.status === 'geclaimd').length, 1); });
  await test('Startitems: ingestelde soorten/aantallen en normale herhaling', async () => { const e = omgeving('ster', { startitems: { bom: 2, radar: 1 } }); const h = e.laad('app/api/speler/startitems/route.ts'); assert.equal((await (await h.POST()).json()).items.length, 3); assert.equal((await (await h.POST()).json()).items.length, 0); });
  await test('Respawn: ongebruikt bezit blijft; gebruikt item keert terug op dezelfde plek', async () => { const e = omgeving('ster'); e.item().respawn_at = new Date(NU - 1).toISOString(); const h = e.laad('app/api/speler/speciaal/route.ts'); await h.GET(); assert.equal(e.item().claimed, true); await e.effect(); await h.GET(); assert.equal(e.item().claimed, false); assert.equal(e.item().latitude, 52); assert.equal(e.item().type, 'ster'); });
  await test('Radar/spook: verlopen effecten worden in status niet als actief getoond', async () => { const e = omgeving('radar'); await e.effect(); e.extraItem('spook', 'spook2'); e.item('spook2').claimed_by_session_id = 's2'; e.actor('p2'); await e.effect('s1', 'spook2'); e.actor('p1'); e.tijd(NU + 601000); const r = await (await e.laad('app/api/speler/speciaal/effecten/route.ts').GET()).json(); assert.equal(r.radar.active, false); assert.equal(r.ghost.active, false); });
  await test('Vervallen: na finish blijven alleen gekozen itemtypen beschikbaar', async () => { const e = omgeving('bom'); e.extraItem('radar', 'radar2'); await e.laad('lib/items-vervallen.ts').laatItemsVervallen(e.admin, ['s1'], { naFinishTypes: ['bom'] }); assert.equal(e.item().used_at, null); assert.ok(e.item('radar2').used_at); });
  await test('Alle tien itemtypen hebben een webp-afbeelding', async () => { for (const type of ['ster', 'verdubbeling', 'radar', 'bom', 'spook', 'dief', 'banaan', 'wissel', 'vraagteken', 'plekzooi']) assert.ok(fs.existsSync(path.join(root, 'public/items', type + '.webp')), type); });

  // Onderstaande controles reproduceren fouten; slagen betekent dat de fout aantoonbaar aanwezig is.
  await test('OPGELOST: banaan ruilt de volgende twee punten en verbruikt het item', async () => { const e = omgeving('banaan'); assert.equal((await e.effect()).status, 200); const v = (p) => e.tabellen.session_point_order.find((r) => r.session_id === 's2' && r.route_point_id === p).volgorde; assert.equal(v('a'), 3); assert.equal(v('b'), 2); assert.ok(e.item().used_at); });
  await test('OPGELOST: dezelfde bom raakt bij gelijktijdig gebruik maar één team', async () => { const e = omgeving('bom'); const r = await Promise.all([e.effect('s2'), e.effect('s3')]); assert.deepEqual(r.map((x) => x.status).sort(), [200, 409]); assert.equal(e.sessie('s2').score + e.sessie('s3').score, 470); });
  await test('OPGELOST: mislukte bommelding trekt niets af; opnieuw proberen trekt één keer af', async () => { const e = omgeving('bom'); e.fouten.push({ tabel: 'special_item_effects', op: 'upsert' }); assert.equal((await e.effect()).status, 500); assert.equal(e.sessie('s2').score, 200); assert.equal(e.item().used_at, null); assert.equal((await e.effect()).status, 200); assert.equal(e.sessie('s2').score, 170); });
  await test('OPGELOST: scorefout bij ster geeft een fout en het item blijft beschikbaar', async () => { const e = omgeving('ster'); e.fouten.push({ tabel: 'player_sessions', op: 'update' }); assert.equal((await e.effect()).status, 500); assert.equal(e.sessie().score, 100); assert.equal(e.item().used_at, null); });
  await test('OPGELOST: bom na respawn werkt opnieuw zonder botsing op het oude effect', async () => { const e = omgeving('bom'); await e.effect(); e.tijd(NU + 901000); await e.laad('app/api/speler/speciaal/route.ts').GET(); assert.equal((await (await e.claim()).json()).status, 'geclaimd'); assert.equal((await e.effect()).status, 200); assert.equal(e.sessie('s2').score, 140); assert.ok(e.item().used_at); });
  await test('OPGELOST: radar na respawn kan opnieuw door hetzelfde team worden ingezet', async () => { const e = omgeving('radar'); await e.effect(); e.tijd(NU + 901000); await e.laad('app/api/speler/speciaal/route.ts').GET(); await e.claim(); assert.equal((await e.effect()).status, 200); });
  await test('OPGELOST: met twee radars blijft een verre tegenstander zichtbaar', async () => { const e = omgeving('radar'); e.extraItem('radar', 'radar2'); e.tabellen.location_updates.push({ id: 'loc1', session_id: 's1', latitude: 52, longitude: 5, created_at: new Date(NU).toISOString() }, { id: 'loc2', session_id: 's2', latitude: 53, longitude: 6, created_at: new Date(NU).toISOString() }); await e.effect(); const h = e.laad('app/api/speler/locaties/route.ts'); let r = await (await h.GET()).json(); assert.equal(r.locaties.find((x) => x.session_id === 's2').latitude, 53); await e.effect('s2', 'radar2'); r = await (await h.GET()).json(); assert.equal(r.locaties.find((x) => x.session_id === 's2').latitude, 53); });
  await test('OPGELOST: twee spoken blokkeren het bereiken net als één spook', async () => { const e = omgeving('spook'); await e.effect(); e.actor('p2'); const h = e.laad('app/api/speler/voortgang/bereik/route.ts'); assert.equal((await h.POST(e.req({ route_point_id: 'start', latitude: 52, longitude: 5 }))).status, 423); e.extraItem('spook', 'spook2'); e.actor('p1'); await e.effect('s2', 'spook2'); e.actor('p2'); assert.equal((await h.POST(e.req({ route_point_id: 'start', latitude: 52, longitude: 5 }))).status, 423); });
  await test('OPGELOST: plek zooi blokkeert het bereiken van een punt ook op de server', async () => { const e = omgeving('plekzooi'); await e.claim(); const h = e.laad('app/api/speler/voortgang/bereik/route.ts'); assert.equal((await h.POST(e.req({ route_point_id: 'start', latitude: 52, longitude: 5 }))).status, 423); });
  await test('SPELREGEL: verdubbeling geldt niet voor een goedgekeurde foto (blijft klaarstaan)', async () => { const e = omgeving('verdubbeling'); e.tabellen.questions[0].type = 'foto_opdracht'; await e.effect(); e.bereikt(); e.tabellen.player_point_progress[0].answered_at = new Date(NU).toISOString(); e.tabellen.foto_inzendingen.push({ id: 'foto', session_id: 's1', route_point_id: 'a', status: 'wacht' }); const h = e.laad('app/api/admin/foto/[id]/route.ts'); assert.equal((await h.PATCH(e.req({ status: 'goedgekeurd', punten: 40 }), { params: { id: 'foto' } })).status, 200); assert.equal(e.sessie().score, 140); assert.equal(e.tabellen.special_item_effects.filter((x) => x.effect_type === 'verdubbeling').length, 1); });
  await test('SPELREGEL: verdubbeling geldt niet voor een stemvraag (blijft klaarstaan)', async () => { const e = omgeving('verdubbeling'); await e.effect(); e.bereikt(); Object.assign(e.tabellen.questions[0], { type: 'stemvraag', stem_gesloten: false }); await e.antwoord('goed'); await e.laad('lib/stemmen.ts').sluitStemmingen(e.admin, 'r1'); assert.equal(e.sessie().score, 140); assert.equal(e.tabellen.special_item_effects.filter((x) => x.effect_type === 'verdubbeling').length, 1); });
  await test('OPGELOST: dief neemt de laatste goede vraag, niet een betaald infopunt', async () => { const e = omgeving('dief'); e.tabellen.player_point_progress.push({ id: 'vraag', session_id: 's2', route_point_id: 'a', is_correct: true, points_awarded: 80, answered_at: new Date(NU - 2000).toISOString() }, { id: 'info', session_id: 's2', route_point_id: 'start', is_correct: true, points_awarded: 10, answered_at: new Date(NU - 1000).toISOString() }); await e.effect(); assert.equal(e.sessie().score, 180); assert.equal(e.sessie('s2').score, 120); });
  await test('OPGELOST: kaartitems zijn niet claimbaar zonder of met een verre positie', async () => { const e = omgeving('bom'); e.item().claimed = false; e.item().claimed_by_session_id = null; const h = e.laad('app/api/speler/speciaal/claim/route.ts'); assert.equal((await h.POST(e.req({ special_item_id: 'item' }))).status, 400); assert.equal((await h.POST(e.req({ special_item_id: 'item', latitude: 52.01, longitude: 5 }))).status, 400); assert.equal(e.item().claimed, false); });
  await test('OPGELOST: na verstreken eindtijd werkt een item niet meer', async () => { const e = omgeving('bom', { eindtijd: new Date(NU - 1000).toISOString() }); assert.equal((await e.effect()).status, 403); assert.equal(e.sessie('s2').score, 200); });
  await test('OPGELOST: gelijktijdige startitemaanvragen geven één set', async () => { const e = omgeving('ster', { startitems: { bom: 1 } }); const h = e.laad('app/api/speler/startitems/route.ts'); await Promise.all([h.POST(), h.POST()]); assert.equal(e.tabellen.special_items.filter((x) => x.is_startitem).length, 1); });
  await test('OPGELOST: startitems niet tijdens pauze en niet vóór het eerste stuk lopen', async () => { const e = omgeving('ster', { startitems: { bom: 1 }, gepauzeerd_sinds: new Date(NU).toISOString() }); const h = e.laad('app/api/speler/startitems/route.ts'); assert.equal((await h.POST()).status, 409); e.tabellen.routes[0].gepauzeerd_sinds = null; e.sessie().afstand_m = 20; assert.equal((await h.POST()).status, 409); e.sessie().afstand_m = 120; assert.equal((await (await h.POST()).json()).items.length, 1); });
  await test('OPGELOST: gelijktijdige scorewijzigingen tellen allebei mee', async () => { const e = omgeving('ster'); await Promise.all([e.laad('lib/score.ts').telBijScore(e.admin, 's1', 10), e.laad('lib/score.ts').telBijScore(e.admin, 's1', 20)]); assert.equal(e.sessie().score, 130); });
  await test('OPGELOST: een opslagfout bij een val geeft een fout, niet "al gehad"', async () => { const e = omgeving('plekzooi'); e.fouten.push({ tabel: 'special_item_effects', op: 'insert' }); const r = await e.claim(); assert.equal(r.status, 503); assert.equal(e.tabellen.special_item_effects.length, 0); });
  await test('OPGELOST: betaald infopunt laat de verdubbeling staan', async () => { const e = omgeving('verdubbeling'); await e.effect(); e.tabellen.player_point_progress.push({ id: 'info', session_id: 's1', route_point_id: 'start', answered_at: null }); const r = await e.laad('app/api/speler/voortgang/verwerk/route.ts').POST(e.req({ route_point_id: 'start' })); assert.equal(r.status, 200); assert.equal(e.sessie().score, 110); assert.equal(e.tabellen.special_item_effects.length, 1); });
  await test('OPGELOST: uitloggen/volgende groep weigert oude toestellen, een nieuwe login mag verder', async () => { const m = e0.laad('lib/inlog-moment.ts'); const uit = '2026-10-28T10:00:00.000Z'; assert.equal(m.uitgelogdNaLogin(uit, '2026-10-28T09:59:00.000Z'), true); assert.equal(m.uitgelogdNaLogin(uit, '2026-10-28T10:01:00.000Z'), false); assert.equal(m.uitgelogdNaLogin(null, null), false); assert.equal(m.uitgelogdNaLogin(uit, null), true); const deel = (o) => Buffer.from(JSON.stringify(o)).toString('base64url'); const token = 'x.' + deel({ iat: 1, amr: [{ method: 'password', timestamp: 1761645600 }] }) + '.y'; assert.equal(m.inlogMoment(token), new Date(1761645600000).toISOString()); });
  for (const [type, foutvorm] of [['ster', 'http'], ['vraagteken', 'http'], ['vraagteken', 'netwerk']]) await test((type === 'vraagteken' && foutvorm === 'http' ? '' : 'OPGELOST: ') + type + ' na ' + foutvorm + 'fout bij direct inzetten komt in de balk', async () => {
    const e = omgeving(type); Object.assign(e.item(), { claimed: false, claimed_by_session_id: null });
    let inventaris = [], melding;
    const handler = clientFunctie('claimSpeciaalItem', {
      bezigSpeciaalRef: { current: false }, gehadPlekzooiRef: { current: new Set() }, huidigePlek: () => ({ latitude: 52, longitude: 5 }), speelPuntBereikt: () => {}, tril: () => {}, TRIL: { itemGepakt: [] },
      setSpecialeItems: () => {}, setScore: () => {}, haalScoreOp: () => {}, inventarisItemGebruikt: () => {},
      setInventaris: (f) => { inventaris = f(inventaris); }, setOpgepakt: (v) => { melding = v; },
      fetch: async (url, opties) => { if (url.endsWith('/claim')) return e.laad('app/api/speler/speciaal/claim/route.ts').POST(e.req(JSON.parse(opties.body))); if (foutvorm === 'netwerk') throw Error('Geen verbinding'); return new Response('{}', { status: 503 }); }
    });
    await handler(kopie(e.item()));
    assert.equal(e.item().claimed, true); assert.equal(e.item().used_at, null);
    assert.equal(inventaris.length, 1);
    if (type === 'ster') assert.ok(melding.extra.includes('balk'));
  });
  await test('OPGELOST: punten erbij en eraf tijdens een spel: elk team houdt een kloppende volgorde', async () => {
    const e = omgeving('ster');
    const rs = e.laad('lib/route-sessies.ts');
    e.tabellen.route_points.splice(3, 0, { id: 'c', route_id: 'r1', name: 'c', order_index: 4, type: 'vraagpunt', latitude: 52.01, longitude: 5.01, points: 10 }, { id: 'd', route_id: 'r1', name: 'd', order_index: 5, type: 'vraagpunt', latitude: 52.02, longitude: 5.02, points: 10 });
    e.tabellen.route_points.find((p) => p.id === 'eind').order_index = 6;
    assert.equal(await rs.werkLopendeSpellenBij(e.admin, 'r1'), true);
    const volgorde = (sid) => e.tabellen.session_point_order.filter((r) => r.session_id === sid).sort((a, b) => a.volgorde - b.volgorde).map((r) => r.route_point_id + r.volgorde).join(',');
    assert.equal(volgorde('s1'), 'start1,a2,b3,c4,d5,eind6');
    e.tabellen.route_points = e.tabellen.route_points.filter((p) => p.id !== 'a');
    assert.equal(await rs.werkLopendeSpellenBij(e.admin, 'r1'), true);
    assert.equal(volgorde('s2'), 'start1,b2,c3,d4,eind5');
  });
  console.log(`\n${resultaten.filter((r) => r.geslaagd).length}/${resultaten.length} controles geslaagd. FOUT = nog openstaande tekortkoming (bewust nog gereproduceerd); OPGELOST = sinds 28-10-2026 gerepareerd, bewaakt het gewenste gedrag.`);
  fs.writeFileSync(path.join(__dirname, 'resultaten.json'), JSON.stringify({ datum: '2026-10-28', methode: 'Echte handlers met lokale Supabase-simulatie; geen live database', resultaten }, null, 2));
})().catch((e) => { console.error(e); process.exitCode = 1; });
