-- 🧩 Puzzelwoord afmaken bij de finish: één poging, binnen 1 minuut na de finish. En per route de volgorde van de letters.
-- De gok wordt bewaard, zodat de spelleider ziet wat elk team invulde en of het goed was.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzel_gok text;
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzel_gok_goed boolean;
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzel_gok_op timestamptz;

-- Volgorde waarin de letters vrijkomen: willekeurig (per team anders) of op volgorde (van links naar rechts)
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_volgorde text NOT NULL DEFAULT 'willekeurig';
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_puzzel_volgorde_check;
ALTER TABLE routes ADD CONSTRAINT routes_puzzel_volgorde_check CHECK (puzzel_volgorde IN ('willekeurig', 'op_volgorde'));

NOTIFY pgrst, 'reload schema';
