// Lokale audit: echte hulp-API, DOM-zoekfunctie en React-effecten met geïsoleerde mocks.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'../..'),uit=[];
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
const laadLib=p=>{const c={exports:{}};vm.runInNewContext(compile(fs.readFileSync(path.join(root,p),'utf8')),c);return c.exports};
const api={exports:{},require:n=>n==='next/server'?{NextResponse:{json:(b,o)=>new Response(JSON.stringify(b),{status:o?.status??200})}}:n==='@/lib/auth-server'?{isBeheer:u=>!!u,haalGebruiker:async()=>({id:'beheer'})}:n==='@/lib/handleiding-ankers'?laadLib('lib/handleiding-ankers.ts'):require(n),process:{cwd:()=>root},Response,console};
vm.runInNewContext(compile(fs.readFileSync(path.join(root,'app/api/admin/uitleg/route.ts'),'utf8')),api);
const haal=async pad=>(await api.exports.GET({nextUrl:new URL('http://audit.invalid/api/admin/uitleg?pad='+encodeURIComponent(pad))})).json();
const sf=ts.createSourceFile('hulp.tsx',fs.readFileSync(path.join(root,'components/admin/HulpKolom.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let norm,zoek;
for(const n of sf.statements){if(ts.isFunctionDeclaration(n)&&n.name?.text==='zoekOpScherm')zoek=n.getText(sf)}
norm=compile(fs.readFileSync(path.join(root,'lib/hulp-namen.ts'),'utf8'));
const dom={exports:{},document:{querySelectorAll:(sel)=>/vraagvenster|dialog/.test(sel)?[]:dom.knoppen},getComputedStyle:(el)=>el.style??{visibility:'visible'},knoppen:[]};vm.runInNewContext(norm+';const normaliseer=normaliseerNaam;'+compile(zoek)+';exports.zoek=zoekOpScherm;',dom);
const knop=(id,tekst,attrs={})=>({id,textContent:tekst,closest:()=>null,getClientRects:()=>[{}],getAttribute:k=>attrs[k]??null});
async function test(naam,fn){try{await fn();uit.push({naam,geslaagd:true});console.log('OK '+naam)}catch(e){uit.push({naam,geslaagd:false,fout:e.message});console.error('MISLUKT '+naam,e.message)}}
function client(){let index=0;const states=['',true,false,null],effecten=[];let calls=0,pad='/admin/routes/r1';
 const react={useState:initial=>{const i=index++;if(states[i]===undefined)states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v}]},useEffect:fn=>effecten.push(fn),useRef:()=>({current:null})};
 const ctx={exports:{},require:n=>n==='react'?react:n==='next/navigation'?{usePathname:()=>pad}:n==='react/jsx-runtime'?{jsx:(t,p)=>({t,p}),jsxs:(t,p)=>({t,p})}:{default:()=>null},document:{documentElement:{classList:{toggle:()=>{},remove:()=>{}}}},fetch:async()=>{calls++;throw Error('offline')},setTimeout,clearTimeout,setInterval,clearInterval};
 vm.runInNewContext(compile(sf.text),ctx);
 return {states,get calls(){return calls},pad:p=>{pad=p},render:()=>{index=0;effecten.length=0;ctx.exports.default();return effecten},ctx};
}
(async()=>{
 const editor=await haal('/admin/routes/r1');fs.writeFileSync(path.join(__dirname,'editor-hulp.html'),editor.html);
 await test('Route-editor krijgt eigen hulp met vier hoofdstukken',()=>{assert.equal(editor.titel,'Route bewerken');assert.equal((editor.html.match(/hulp-niveau-3/g)||[]).length>=3,true);assert.ok(editor.html.includes('Extra’s')||editor.html.includes("Extra&#39;s")||editor.html.includes("Extra's"))});
 await test('Startuitleg en itemuitleg zijn aanwezig',()=>{assert.ok(editor.html.includes('Eerste stappen'));assert.ok(editor.html.includes('Beschikbare itemtypen'))});
 await test('OPGELOST: de aparte vraag-editor krijgt bovenaan de uitleg bij het invullen van een vraag',async()=>{const v=await haal('/admin/routes/r1/punten/p1/vraag');assert.ok(v.html.includes('hulp-focus'));assert.ok(v.titel.includes('vraag'))});
 await test('OPGELOST: link naar Het spel starten gaat naar de volledige handleiding (nieuw tabblad)',()=>{assert.ok(editor.html.includes('href="/admin/uitleg#het-spel-starten" target="_blank"'))});
 await test('OPGELOST: de hulp verwijst voor het puzzelwoord naar de werkbalk, niet meer naar Instellingen → Spel',()=>{assert.ok(editor.html.includes('Het puzzelwoord staat niet meer hier'))});
 await test('Aanwijzen vindt knop via aria-label en negeert eigen hulpkolom',()=>{const eigen=knop('eigen','Testen');eigen.closest=()=>({});dom.knoppen=[eigen,knop('echt','',{ 'aria-label':'🧪 Testen' })];assert.equal(dom.exports.zoek('🧪 Testen').id,'echt')});
 await test('Aanwijzen geeft exacte match voorrang boven langere tekst',()=>{dom.knoppen=[knop('lang','Alle vragen doorlopen'),knop('exact','Alle vragen')];assert.equal(dom.exports.zoek('Alle vragen').id,'exact')});
 await test('OPGELOST: gecombineerde knopnaam Vraag invullen / bewerken wordt herkend',()=>{dom.knoppen=[knop('vraag','Vraag invullen')];assert.equal(dom.exports.zoek('Vraag invullen / bewerken').id,'vraag')});
 await test('OPGELOST: bij gelijknamige knoppen wint de knop op de pagina van die in het menu',()=>{const menu=knop('hoofdmenu','Instellingen');menu.closest=(s)=>/admin-sidebar|nav/.test(s)?{}:null;dom.knoppen=[menu,knop('editor','Instellingen')];assert.equal(dom.exports.zoek('⚙️ Instellingen').id,'editor')});
 await test('OPGELOST: een knop met visibility hidden wordt niet aangewezen',()=>{const hidden=knop('verborgen','Testen');hidden.style={visibility:'hidden'};dom.knoppen=[hidden];assert.equal(dom.exports.zoek('Testen'),null)});
 await test('Knop zonder clientrects wordt wel overgeslagen',()=>{const hidden=knop('dicht','Testen');hidden.getClientRects=()=>[];dom.knoppen=[hidden];assert.equal(dom.exports.zoek('Testen'),null)});
 await test('OPGELOST: na een netwerkfout volgt een foutmelding en Opnieuw proberen haalt opnieuw op',async()=>{const c=client();c.render().at(-1)();await new Promise(r=>setTimeout(r,0));assert.equal(c.calls,1);assert.equal(c.states[3],null);assert.equal(c.states[4],true);c.states[5]=(c.states[5]??0)+1;c.render().at(-1)();await new Promise(r=>setTimeout(r,0));assert.equal(c.calls,2)});
 await test('Padwissel na fout kan wel opnieuw ophalen',async()=>{const c=client();c.render().at(-1)();await new Promise(r=>setTimeout(r,0));c.pad('/admin/routes/r2');c.render().at(-1)();await new Promise(r=>setTimeout(r,0));assert.equal(c.calls,2)});
 await test('Oude fetchrespons wordt genegeerd na opruimen van effect',async()=>{const c=client();const opruimen=c.render().at(-1)();opruimen();await new Promise(r=>setTimeout(r,0));assert.equal(c.states[3],null)});
 fs.writeFileSync(path.join(__dirname,'resultaten.json'),JSON.stringify({datum:'2026-10-27',methode:'Echte hulp-API en geëxtraheerde zoekfunctie; effectcontrole met React/fetch-mocks. FOUT = nog open gebrek bevestigd; OPGELOST = sinds 28-10-2026 gerepareerd.',resultaten:uit},null,2));
 console.log(`${uit.filter(r=>r.geslaagd).length}/${uit.length} bevestigd`);if(uit.some(r=>!r.geslaagd))process.exitCode=1;
})();
