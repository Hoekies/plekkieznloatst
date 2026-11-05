-- Migratie 015: meespeellink aan of uit per route (5 november 2026)
--
-- Een team kan medespelers laten meekijken via een geheime link: de items op het speelveld, de verdiende letters en
-- de score. De spelleider kan dat per route uitzetten. Standaard staat het aan. Zonder deze kolom werkt de link gewoon
-- (hij staat dan aan), alleen de knop Uit in de route-instellingen kan het dan nog niet opslaan.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS meespeellink boolean NOT NULL DEFAULT true;
NOTIFY pgrst, 'reload schema';
