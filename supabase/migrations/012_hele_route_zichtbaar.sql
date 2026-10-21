-- Route op volgorde: de spelers zien meteen de hele route (alle punten en de lijn ertussen),
-- in plaats van alleen het volgende punt. Handig bij een ingelezen wandeling (GPX).
-- routes.alle_punten_zichtbaar: false = zoals altijd (alleen het volgende punt).
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS alle_punten_zichtbaar boolean NOT NULL DEFAULT false;
