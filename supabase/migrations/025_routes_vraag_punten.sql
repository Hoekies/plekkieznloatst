-- ❓ Standaard punten per vraag voor een route: een nieuwe vraag krijgt dit aantal (leeg = 65).
-- Geen nieuwe tabel, alleen een kolom bij routes.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS vraag_punten integer;

NOTIFY pgrst, 'reload schema';
