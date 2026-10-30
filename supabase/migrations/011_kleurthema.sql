-- Migratie 011: 🎨 kleurthema van de spelersapp per route (30 oktober 2026)
--
-- routes.huis_thema: paars (leeg), blauw, groen, antraciet of bordeaux. Leeg = de gewone paarse PointRush-kleuren.
-- Instellen in de route-editor → ⚙️ Instellingen → 🎨 Uiterlijk → Achtergrond.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS huis_thema text;
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_huis_thema_check;
ALTER TABLE routes ADD CONSTRAINT routes_huis_thema_check CHECK (huis_thema IS NULL OR huis_thema IN ('blauw', 'groen', 'antraciet', 'bordeaux'));

NOTIFY pgrst, 'reload schema';
