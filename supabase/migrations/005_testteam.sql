-- Migratie 005: 🧪 testteam (29 oktober 2026)
--
-- Een team om in je eentje een rondje te lopen ("team"), met een nep-tegenstander die items op je gooit en
-- waar jij items op kunt gooien ("tegenstander"). Testteams en echte teams zien en raken elkaar niet, en een
-- test telt niet mee in de statistiek, de stand of het rapport. Geen nieuwe tabel: alleen een kolom.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE players ADD COLUMN IF NOT EXISTS test_rol text;
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_test_rol_check;
ALTER TABLE players ADD CONSTRAINT players_test_rol_check CHECK (test_rol IS NULL OR test_rol IN ('team', 'tegenstander'));

NOTIFY pgrst, 'reload schema';
