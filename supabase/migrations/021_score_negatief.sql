-- ➖ Score mag onder 0: een bom, een fout antwoord met minpunten of een aftrek van de spelleider kost
-- altijd punten, ook als het team daardoor in de min komt. Zonder deze migratie blijft de score op 0 staan.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE player_sessions DROP CONSTRAINT IF EXISTS player_sessions_score_check;

NOTIFY pgrst, 'reload schema';
