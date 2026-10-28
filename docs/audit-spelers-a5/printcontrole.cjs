// Audit van de bestaande printfunctie; genereert alleen lokale auditbestanden.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
const bestand=path.join(root,'components/admin/InfoKnop.tsx');
const sf=ts.createSourceFile(bestand,fs.readFileSync(bestand,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let functie;
function zoek(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='printKaart')functie=n;ts.forEachChild(n,zoek)}zoek(sf);
let html='';const venster={document:{write:s=>{html=s},close:()=>{},querySelector:()=>null}};
const ctx={exports:{},URL,window:{location:{origin:'http://audit.invalid'},open:()=>venster}};
vm.runInNewContext(ts.transpileModule('exports.print='+functie.getText(sf),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,ctx);
ctx.exports.print('/handleiding.jpg','Spelers (A5)','A5');
html=html.replace('http://audit.invalid/handleiding.jpg',pathToFileURL(path.join(root,'public/handleiding.jpg')).href);
fs.writeFileSync(path.join(__dirname,'printvoorbeeld.html'),html);
async function main(){
 const tabs=await(await fetch('http://127.0.0.1:9470/json')).json();const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 ws.onmessage=({data})=>{const m=JSON.parse(data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.j(m.error):p.r(m.result)}};
 const send=(method,params={})=>new Promise((r,j)=>{const n=++id;pending.set(n,{r,j});ws.send(JSON.stringify({id:n,method,params}))});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:559,height:794,deviceScaleFactor:1,mobile:false});
 await send('Emulation.setEmulatedMedia',{media:'print'});
 await send('Page.navigate',{url:pathToFileURL(path.join(__dirname,'printvoorbeeld.html')).href});await new Promise(r=>setTimeout(r,400));await ev('document.querySelector("img").decode().then(()=>true)');
 const meting=await ev(`(()=>{const i=document.querySelector('img'),r=i.getBoundingClientRect();return {origineel:{breedte:i.naturalWidth,hoogte:i.naturalHeight},viewport:{breedte:innerWidth,hoogte:innerHeight},afbeelding:{x:r.x,y:r.y,breedte:r.width,hoogte:r.height},scroll:{breedte:document.documentElement.scrollWidth,hoogte:document.documentElement.scrollHeight}}})()`);
 const pdf=await send('Page.printToPDF',{preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});fs.writeFileSync(path.join(__dirname,'spelers-a5-printproef.pdf'),Buffer.from(pdf.data,'base64'));
 const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(__dirname,'a5-pasvorm.png'),Buffer.from(shot.data,'base64'));
 const a5={breedteMm:148,hoogteMm:210};const w=210*1024/1536;
 fs.writeFileSync(path.join(__dirname,'metingen.json'),JSON.stringify({datum:'2026-10-27',methode:'Echte printKaart-functie, alleen afbeeldings-URL vervangen door lokaal bestand; Chrome print-media screenshot en PDF.',...meting,a5,berekend:{afbeeldingBreedteMm:w,witteRandPerZijdeMm:(148-w)/2,effectievePpi:1536/(210/25.4),vouwlijnMm:105}},null,2));
 console.log(JSON.stringify(meting));await send('Browser.close');ws.close();
}main().catch(e=>{console.error(e);process.exitCode=1});
