-- Migratie 008: ⚙️ instellingen voor het spelplezier (29 oktober 2026)
--
-- Per route de instellingen van 🪤 val, 🔥 reeks, 🎖️ badges, 📸 fotobattle, 📦 vliegende schat, 🎰 rad en
-- ⏰ gouden kwartier, als één JSON-veld (leeg = de standaardwaarden uit lib/spelplezier.ts). En wanneer de punten
-- van de fotobattle zijn uitgekeerd (bij het vrijgeven van de uitslag; één keer per spel).
-- Nodig: migratie 007.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS spelplezier jsonb;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS fotobattle_uitgekeerd_op timestamptz;

NOTIFY pgrst, 'reload schema';
