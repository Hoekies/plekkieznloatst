-- Migratie 003: de tabel routes afschermen voor spelers (audit F06, 26 oktober 2026)
--
-- Een ingelogde speler kon de actieve route rechtstreeks bij Supabase opvragen, met daarin het puzzelwoord.
-- De app leest routes alleen via de server (service_role), net als vragen, antwoorden, punten en items, die
-- al zo afgeschermd waren (zie "beveiliging spelers alleen lezen" in 001_schema.sql). Mag vaker gedraaid worden.

REVOKE SELECT ON routes FROM anon, authenticated;
DROP POLICY IF EXISTS "routes_speler_actief_lezen" ON routes;

-- 🎒 Startitems maar één keer per spel (audit I09): de server legt vast wanneer ze zijn uitgedeeld, zodat
-- twee aanvragen tegelijk geen twee sets geven.
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS startitems_op timestamptz;

NOTIFY pgrst, 'reload schema';
