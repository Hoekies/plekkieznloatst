-- 🧩 Puzzelwoord raden bij de finish: de minuut loopt pas als het team op "Start" tikt (niet meer vanaf de
-- finish). Hier staat wanneer dat was. Leeg = nog niet gestart. Geen nieuwe tabel, alleen een kolom.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzel_raad_start timestamptz;

NOTIFY pgrst, 'reload schema';
