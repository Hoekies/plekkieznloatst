-- 1. Bericht aan één team: broadcasts.player_id (leeg = alle teams)
-- 2. Telefoonnummer per team: WhatsApp opent meteen de juiste chat, en bellen vanuit het beheer
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS player_id uuid REFERENCES players(id) ON DELETE CASCADE;

-- Spelers lezen alleen berichten aan iedereen en aan hun eigen team
DROP POLICY IF EXISTS "broadcasts_speler_lezen" ON broadcasts;
CREATE POLICY "broadcasts_speler_lezen" ON broadcasts FOR SELECT TO authenticated
  USING (NOT is_admin() AND (player_id IS NULL OR player_id IN (SELECT id FROM players WHERE auth_user_id = auth.uid())));

ALTER TABLE players ADD COLUMN IF NOT EXISTS telefoon text;

NOTIFY pgrst, 'reload schema';
