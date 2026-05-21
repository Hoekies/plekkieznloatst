-- ══════════════════════════════════════════════════════════════════════════════
-- Plekkie z'n Loatst — Migratie 002: Row Level Security policies
-- ══════════════════════════════════════════════════════════════════════════════

-- ── RLS inschakelen ───────────────────────────────────────────────────────────
ALTER TABLE routes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_points           ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_options         ENABLE ROW LEVEL SECURITY;
ALTER TABLE players                ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_point_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_updates       ENABLE ROW LEVEL SECURITY;

-- ── Helper functies ───────────────────────────────────────────────────────────

-- Controleert of de huidige gebruiker admin is via user_metadata
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'admin',
    false
  );
$$;

-- Geeft het players.id terug van de huidige gebruiker
CREATE OR REPLACE FUNCTION mijn_player_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id FROM players WHERE auth_user_id = auth.uid();
$$;

-- ── routes ───────────────────────────────────────────────────────────────────
-- Admin: volledige toegang
CREATE POLICY "routes_admin_alles" ON routes
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());

-- Speler: alleen de actieve route lezen
CREATE POLICY "routes_speler_actief_lezen" ON routes
  FOR SELECT TO authenticated
  USING (NOT is_admin() AND is_active = true);

-- ── route_points ─────────────────────────────────────────────────────────────
CREATE POLICY "route_points_admin_alles" ON route_points
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "route_points_speler_lezen" ON route_points
  FOR SELECT TO authenticated
  USING (
    NOT is_admin() AND
    route_id IN (SELECT id FROM routes WHERE is_active = true)
  );

-- ── questions ─────────────────────────────────────────────────────────────────
CREATE POLICY "questions_admin_alles" ON questions
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "questions_speler_lezen" ON questions
  FOR SELECT TO authenticated
  USING (
    NOT is_admin() AND
    route_point_id IN (
      SELECT rp.id FROM route_points rp
      JOIN routes r ON rp.route_id = r.id
      WHERE r.is_active = true
    )
  );

-- ── answer_options ────────────────────────────────────────────────────────────
CREATE POLICY "answer_options_admin_alles" ON answer_options
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "answer_options_speler_lezen" ON answer_options
  FOR SELECT TO authenticated
  USING (
    NOT is_admin() AND
    question_id IN (
      SELECT q.id FROM questions q
      JOIN route_points rp ON q.route_point_id = rp.id
      JOIN routes r ON rp.route_id = r.id
      WHERE r.is_active = true
    )
  );

-- ── players ───────────────────────────────────────────────────────────────────
CREATE POLICY "players_admin_alles" ON players
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());

-- Speler leest/update alleen eigen rij
CREATE POLICY "players_speler_eigen_lezen" ON players
  FOR SELECT TO authenticated
  USING (NOT is_admin() AND auth_user_id = auth.uid());

CREATE POLICY "players_speler_eigen_updaten" ON players
  FOR UPDATE TO authenticated
  USING    (NOT is_admin() AND auth_user_id = auth.uid())
  WITH CHECK (NOT is_admin() AND auth_user_id = auth.uid());

-- ── player_sessions ───────────────────────────────────────────────────────────
CREATE POLICY "player_sessions_admin_alles" ON player_sessions
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "player_sessions_speler_eigen" ON player_sessions
  FOR ALL TO authenticated
  USING    (NOT is_admin() AND player_id = mijn_player_id())
  WITH CHECK (NOT is_admin() AND player_id = mijn_player_id());

-- ── player_point_progress ─────────────────────────────────────────────────────
CREATE POLICY "progress_admin_alles" ON player_point_progress
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "progress_speler_eigen" ON player_point_progress
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

-- ── location_updates ──────────────────────────────────────────────────────────
-- Admin ziet alles (inclusief exacte coördinaten)
CREATE POLICY "location_updates_admin_alles" ON location_updates
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());

-- Speler schrijft alleen eigen locatie bij een actieve sessie
CREATE POLICY "location_updates_speler_schrijven" ON location_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT is_admin() AND
    session_id IN (
      SELECT id FROM player_sessions
      WHERE player_id = mijn_player_id() AND status = 'actief'
    )
  );

-- Speler leest alleen de publieke (afgeronde) coördinaten van actieve medespelers
-- Let op: dit geeft de hele rij terug — kolom-level filtering via een view (zie hieronder)
CREATE POLICY "location_updates_speler_public_lezen" ON location_updates
  FOR SELECT TO authenticated
  USING (
    NOT is_admin() AND
    session_id IN (
      SELECT ps.id FROM player_sessions ps
      JOIN routes r ON ps.route_id = r.id
      WHERE r.is_active = true AND ps.status = 'actief'
    )
  );

-- ── View voor spelers: alleen publieke locaties ───────────────────────────────
-- Verbergt exacte lat/lng; spelers gebruiken deze view, niet de tabel direct.
CREATE OR REPLACE VIEW public_locaties AS
SELECT
  lu.id,
  lu.session_id,
  lu.public_latitude  AS latitude,
  lu.public_longitude AS longitude,
  lu.created_at,
  p.group_name
FROM location_updates lu
JOIN player_sessions ps ON lu.session_id = ps.id
JOIN players p ON ps.player_id = p.id
WHERE ps.status = 'actief';
