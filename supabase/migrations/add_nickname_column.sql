-- Voeg nickname kolom toe aan players tabel
-- Spelers kunnen hun eigen bijnaam kiezen tijdens het spel
-- group_name blijft de originele naam ingesteld door de beheerder
ALTER TABLE players ADD COLUMN IF NOT EXISTS nickname TEXT;
