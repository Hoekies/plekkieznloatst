// 🗄️ Database-check (alleen lezen): staan alle tabellen en kolommen uit supabase/migrations/*.sql in Supabase?
// Draait mee in "npm run controle" (vóór elke push) en los met "npm run database". Een ontbrekende migratie
// stopt de push niet: je krijgt een waarschuwing met het nummer van de migratie die je nog moet draaien.
// Geheimen worden nooit geprint. Zonder .env.local of zonder internet wordt de check overgeslagen.
import fs from "node:fs";
import { verwachtSchema } from "../lib/migratie-schema.mjs";

function leesEnv() {
  try {
    return Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((r) => r.includes("=") && !r.trim().startsWith("#"))
      .map((r) => { const i = r.indexOf("="); return [r.slice(0, i).trim(), r.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
  } catch { return {}; }
}
const env = { ...leesEnv(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL, sleutel = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !sleutel) { console.log("⏭️  Database-check overgeslagen (geen .env.local)"); process.exit(0); }

// Wat de migraties verwachten: tabel → kolom → bestand (zelfde bron als de Systeemcheck)
const map = "supabase/migrations";
const verwacht = verwachtSchema();

const kop = { apikey: sleutel, Authorization: `Bearer ${sleutel}` };
const bestaat = (pad) => fetch(`${url}/rest/v1/${pad}&limit=0`, { headers: kop }).then((r) => r.ok);
const missend = new Map(); // bestand → lijst
let goed = 0;
try {
  for (const [tabel, kolommen] of verwacht) {
    if (!(await bestaat(`${tabel}?select=*`))) {
      const bron = [...kolommen.values()][0] ?? "?";
      missend.set(bron, [...(missend.get(bron) ?? []), `tabel ${tabel}`]);
      continue;
    }
    const uitslagen = await Promise.all([...kolommen].map(async ([k, bron]) => [k, bron, await bestaat(`${tabel}?select=${k}`)]));
    for (const [k, bron, ok] of uitslagen) {
      if (ok) goed++; else missend.set(bron, [...(missend.get(bron) ?? []), `${tabel}.${k}`]);
    }
  }
} catch {
  console.log("⏭️  Database-check overgeslagen (geen verbinding met Supabase)");
  process.exit(0);
}

if (!missend.size) { console.log(`✅ Database: alle migraties zijn gedraaid (${goed} kolommen)`); process.exit(0); }
console.log("⚠️  Database: nog niet alle migraties zijn gedraaid. Draai in Supabase → SQL Editor:");
for (const [bestand, wat] of [...missend].sort()) console.log(`   • ${map}/${bestand}  (mist: ${wat.slice(0, 4).join(", ")}${wat.length > 4 ? ` en nog ${wat.length - 4}` : ""})`);
// Waarschuwing, geen fout: de push gaat gewoon door
process.exit(0);
