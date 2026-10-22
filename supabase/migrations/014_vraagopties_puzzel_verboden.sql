-- Per vraag: antwoorden husselen, een geluidsfragment en een tijdslimiet (elk aan of uit).
-- Per route: een puzzelwoord (elke goede vraag geeft een letter) en verboden gebieden op de kaart.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig. Wel een nieuwe opslagmap voor geluid (openbaar te lezen,
-- uploaden gaat alleen via de server).

-- Vragen
ALTER TABLE questions ADD COLUMN IF NOT EXISTS antwoorden_husselen boolean NOT NULL DEFAULT false;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS geluid_pad text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tijdslimiet_seconden integer;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_tijdslimiet_check;
ALTER TABLE questions ADD CONSTRAINT questions_tijdslimiet_check
  CHECK (tijdslimiet_seconden IS NULL OR tijdslimiet_seconden BETWEEN 10 AND 600);

-- Puzzelwoord: leeg = uit. Bonus bij het goed raden aan de finish.
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzelwoord text;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_bonus integer NOT NULL DEFAULT 100;
-- Omschrijving voor de spelers, bijv. "Een ander woord voor slot (7 letters)"
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_omschrijving text;
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzel_opgelost boolean NOT NULL DEFAULT false;

-- Verboden gebieden: lijst van vlakken, elk { naam, punten: [[lat, lng], ...] }
ALTER TABLE routes ADD COLUMN IF NOT EXISTS verboden_gebieden jsonb;

-- Opslag voor geluidsfragmenten bij vragen
INSERT INTO storage.buckets (id, name, public) VALUES ('vraag-geluid', 'vraag-geluid', true)
ON CONFLICT (id) DO NOTHING;
