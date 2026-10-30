-- Migratie 010: 🧩 volgorde van de letters van het puzzelwoord (30 oktober 2026)
--
-- Herstel: deze kolom hoort bij het oude migratie 018 (nu onderdeel van 001_schema.sql), maar ontbrak in de
-- database. Zonder deze kolom lukt "Willekeurige plek" / "Van links naar rechts" bij het puzzelwoord niet.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_volgorde text NOT NULL DEFAULT 'willekeurig';
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_puzzel_volgorde_check;
ALTER TABLE routes ADD CONSTRAINT routes_puzzel_volgorde_check CHECK (puzzel_volgorde IN ('willekeurig', 'op_volgorde'));

NOTIFY pgrst, 'reload schema';
