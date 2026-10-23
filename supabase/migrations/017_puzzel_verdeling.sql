-- 🧩 Puzzelwoord aan of uit, en per vraag hoeveel letters een goed antwoord oplevert (0, 1 of 2).
-- Standaard geeft elke vraag één letter; is het woord korter of langer dan het aantal vragen, dan kiest
-- de beheerder welke vragen geen letter of twee letters geven.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_aan boolean;
-- { "<route_point_id>": 0 | 1 | 2 }; ontbreekt een punt, dan 1
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_verdeling jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 🧩 Punten voor het puzzelwoord, uitbetaald bij de finish:
--   puzzel_letter_punten per gevonden letter (standaard 10),
--   puzzel_bonus als alle letters met vragen gevonden zijn (standaard 100),
--   puzzel_raad_bonus als het team het woord zelf afmaakt (standaard 50).
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_letter_punten integer NOT NULL DEFAULT 10;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_raad_bonus integer NOT NULL DEFAULT 50;
-- Hoeveel letters al zijn uitbetaald (letters die later nog bijkomen, bijv. door een goedgekeurde foto, komen erbij)
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzel_letters_betaald integer NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
