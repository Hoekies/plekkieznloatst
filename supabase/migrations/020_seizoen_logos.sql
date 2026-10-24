-- 🗓️ Seizoenslogo's: per thema (Halloween, Kerst, zomer, …) ook een eigen versie van het spellogo,
-- vierkant en breed. De app kiest op datum welke getoond wordt; zonder seizoenslogo het gewone logo.
-- Bouwt voort op migratie 019 (zelfde tabel, geen nieuwe tabel: de GRANT van 019 geldt ook hier).
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE seizoen_achtergronden ALTER COLUMN pad DROP NOT NULL;              -- een thema mag alleen een logo hebben
ALTER TABLE seizoen_achtergronden ADD COLUMN IF NOT EXISTS logo_pad text;       -- vierkant logo (opslag "route-afbeeldingen")
ALTER TABLE seizoen_achtergronden ADD COLUMN IF NOT EXISTS logo_breed_pad text; -- breed logo (bovenbalk, rapport, beamer)

NOTIFY pgrst, 'reload schema';
