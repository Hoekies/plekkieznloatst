-- Migratie 012: 🎨 meer kleurthema's voor de spelersapp (31 oktober 2026)
--
-- Erbij: petrol, koper, magenta, middernacht en olijf (naast blauw, groen, antraciet en bordeaux; leeg = paars).
-- Alleen de controle op de toegestane waarden wordt ruimer; er verandert niets aan bestaande routes.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_huis_thema_check;
ALTER TABLE routes ADD CONSTRAINT routes_huis_thema_check CHECK (huis_thema IS NULL OR huis_thema IN
  ('blauw', 'groen', 'antraciet', 'bordeaux', 'petrol', 'koper', 'magenta', 'middernacht', 'olijf'));

NOTIFY pgrst, 'reload schema';
