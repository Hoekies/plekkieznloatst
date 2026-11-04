-- Migratie 014: het thema van een spel bewaren (4 november 2026)
--
-- Zo houdt een gedeelde link of oud rapport het thema waarin gespeeld is, ook als er later een ander seizoen is of een
-- ander thema vastgezet. Zonder deze kolom werkt alles gewoon: dan kiest de app het thema op de datum van het spel.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS thema text;
NOTIFY pgrst, 'reload schema';
