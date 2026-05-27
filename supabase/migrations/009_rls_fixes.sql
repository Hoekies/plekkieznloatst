-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 009: RLS-fixes
--   • foto_inzendingen — RLS inschakelen (was volledig open)
--   • broadcasts       — RLS inschakelen (was volledig open)
--   • session_point_order — admin-policy toevoegen (alleen speler-read bestond)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. foto_inzendingen ────────────────────────────────────────────────────────
ALTER TABLE foto_inzendingen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "foto_inzendingen_admin_alles" ON foto_inzendingen
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());

-- Speler: lezen en insturen voor eigen sessie
CREATE POLICY "foto_inzendingen_speler_eigen" ON foto_inzendingen
  FOR ALL TO authenticated
  USING (
    NOT is_admin() AND
    session_id IN (
      SELECT id FROM player_sessions WHERE player_id = mijn_player_id()
    )
  )
  WITH CHECK (
    NOT is_admin() AND
    session_id IN (
      SELECT id FROM player_sessions WHERE player_id = mijn_player_id()
    )
  );

-- ── 2. broadcasts ──────────────────────────────────────────────────────────────
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- Admin: aanmaken, lezen, verwijderen
CREATE POLICY "broadcasts_admin_alles" ON broadcasts
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());

-- Speler: alleen lezen (broadcasts zijn bedoeld voor alle actieve spelers)
CREATE POLICY "broadcasts_speler_lezen" ON broadcasts
  FOR SELECT TO authenticated
  USING (NOT is_admin());

-- ── 3. session_point_order — admin-policy toevoegen ───────────────────────────
-- RLS stond al aan via migratie 007; alleen de speler-SELECT policy bestond.
-- Admin mist INSERT/UPDATE/DELETE toegang (nodig bij route-reset en beheer).
CREATE POLICY "spo_admin_alles" ON session_point_order
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());
