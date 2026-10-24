-- 📁 Routes ordenen in mappen (bijv. "Bedrijfsuitjes") en 📊 per vraag bewaren hoe vaak die goed ging,
-- ook na "Nieuw spel voorbereiden" (dan worden de antwoorden zelf gewist).
-- Geen nieuwe tabel, alleen kolommen bij routes.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS map text;                                      -- naam van de map, leeg = geen map
ALTER TABLE routes ADD COLUMN IF NOT EXISTS vraag_statistiek jsonb NOT NULL DEFAULT '{}'::jsonb;  -- { punt_id: { n, goed } }

NOTIFY pgrst, 'reload schema';
