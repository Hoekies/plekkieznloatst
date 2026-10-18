-- Wachtwoord van een team versleuteld bewaren, zodat de beheerder bij opnieuw versturen hetzelfde
-- wachtwoord meestuurt (tenzij hij met 🎲 een nieuw kiest). Inloggen blijft via Supabase Auth gaan;
-- dit is alleen een versleutelde kopie die alleen de server kan openen.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE players ADD COLUMN IF NOT EXISTS wachtwoord_versleuteld text;

NOTIFY pgrst, 'reload schema';
