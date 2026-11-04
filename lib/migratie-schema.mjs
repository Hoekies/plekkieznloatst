// 🗄️ Wat de migraties verwachten, rechtstreeks uit supabase/migrations/*.sql. Eén bron voor "npm run controle"
// (scripts/database-check.mjs) en de Systeemcheck: een nieuwe migratie wordt zo vanzelf meegenomen.
import fs from "node:fs";
import path from "node:path";

const MAP = "supabase/migrations";

function bestanden() {
  const map = path.join(process.cwd(), MAP);
  return fs.readdirSync(map).filter((x) => x.endsWith(".sql")).sort()
    .map((f) => ({ f, sql: fs.readFileSync(path.join(map, f), "utf8").replace(/--[^\n]*/g, "") }));
}

/** Tabel → kolom → bestand waarin hij staat. @returns {Map<string, Map<string, string>>} */
export function verwachtSchema() {
  const verwacht = new Map();
  for (const { f, sql } of bestanden()) {
    for (const m of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\);/gi)) {
      if (!verwacht.has(m[1])) verwacht.set(m[1], new Map());
      for (const regel of m[2].split("\n")) {
        const k = regel.trim().match(/^(\w+)\s+(uuid|text|integer|int|bigint|boolean|timestamptz|double|float8|jsonb|numeric|smallint|date|real|serial|bigserial)/i);
        if (k && !/^(constraint|primary|unique|check|foreign)$/i.test(k[1])) verwacht.get(m[1]).set(k[1], f);
      }
    }
    for (const m of sql.matchAll(/ALTER TABLE\s+(?:public\.)?(\w+)\s+ADD COLUMN(?: IF NOT EXISTS)?\s+(\w+)/gi)) {
      if (!verwacht.has(m[1])) verwacht.set(m[1], new Map());
      verwacht.get(m[1]).set(m[2], f);
    }
  }
  return verwacht;
}

/** De opslagmappen uit de migraties: naam → openbaar? @returns {Map<string, boolean>} */
export function verwachteMappen() {
  const mappen = new Map();
  for (const { sql } of bestanden()) {
    for (const blok of sql.matchAll(/INSERT INTO storage\.buckets[^;]*;/gi)) {
      for (const m of blok[0].matchAll(/\('([\w-]+)',\s*'[\w-]+',\s*(true|false)\)/gi)) mappen.set(m[1], m[2].toLowerCase() === "true");
    }
  }
  return mappen;
}
