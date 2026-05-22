-- Voeg icon kolom toe aan players tabel
ALTER TABLE players ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '🦊';
