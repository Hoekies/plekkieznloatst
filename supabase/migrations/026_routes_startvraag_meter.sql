-- 🚶 Rondje: na het welkomstscherm loopt een team eerst een stukje voordat de eerste vraag komt. Hier staat
-- hoeveel meter (leeg = 25). Geen nieuwe tabel, alleen een kolom bij routes.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS startvraag_meter integer;

NOTIFY pgrst, 'reload schema';
