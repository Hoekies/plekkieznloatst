-- ============================================================
-- Row Level Security (RLS) — Plekkie z'n Loatst
-- ============================================================
-- Voer dit uit in de Supabase SQL-editor NADAT het schema is
-- aangemaakt. Alle datamutaties lopen via de service-role key
-- (createAdminClient) in server-side API routes, die RLS
-- omzeilt. Deze policies beschermen tegen directe Supabase
-- client-toegang (bijv. via het anon-key of iemands eigen JWT).
-- ============================================================

-- ── RLS inschakelen op alle tabellen ────────────────────────
ALTER TABLE routes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_points         ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_options       ENABLE ROW LEVEL SECURITY;
ALTER TABLE players              ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_point_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_updates     ENABLE ROW LEVEL SECURITY;

-- ── routes ───────────────────────────────────────────────────
-- Spelers mogen alleen gepubliceerde en actieve routes zien.
-- Schrijven uitsluitend via service role (admin API).
CREATE POLICY "routes: spelers lezen gepubliceerd"
  ON routes FOR SELECT
  TO authenticated
  USING (status = 'gepubliceerd' OR is_active = true);

-- ── route_points ─────────────────────────────────────────────
-- Spelers mogen punten zien van gepubliceerde/actieve routes.
CREATE POLICY "route_points: spelers lezen"
  ON route_points FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_points.route_id
        AND (r.status = 'gepubliceerd' OR r.is_active = true)
    )
  );

-- ── questions ────────────────────────────────────────────────
-- Spelers mogen vragen lezen (is_correct wordt apart afgeschermd
-- door de API: /api/speler/vraag/[pid] selecteert is_correct nooit).
CREATE POLICY "questions: spelers lezen"
  ON questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM route_points rp
      JOIN routes r ON r.id = rp.route_id
      WHERE rp.id = questions.route_point_id
        AND (r.status = 'gepubliceerd' OR r.is_active = true)
    )
  );

-- ── answer_options ───────────────────────────────────────────
-- Zelfde scope als questions. is_correct nooit via anon/JWT
-- blootgesteld dankzij de select-whitelist in de API.
CREATE POLICY "answer_options: spelers lezen"
  ON answer_options FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM questions q
      JOIN route_points rp ON rp.id = q.route_point_id
      JOIN routes r ON r.id = rp.route_id
      WHERE q.id = answer_options.question_id
        AND (r.status = 'gepubliceerd' OR r.is_active = true)
    )
  );

-- ── players ──────────────────────────────────────────────────
-- Speler mag alleen zijn eigen rij lezen.
CREATE POLICY "players: eigen rij lezen"
  ON players FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- ── player_sessions ──────────────────────────────────────────
-- Speler mag alleen zijn eigen sessies lezen.
CREATE POLICY "player_sessions: eigen sessies lezen"
  ON player_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_sessions.player_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- ── player_point_progress ────────────────────────────────────
CREATE POLICY "player_point_progress: eigen voortgang lezen"
  ON player_point_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM player_sessions ps
      JOIN players p ON p.id = ps.player_id
      WHERE ps.id = player_point_progress.session_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- ── location_updates ─────────────────────────────────────────
-- Spelers mogen GEEN locaties direct lezen via de client.
-- Alle locatietoegang loopt via de beveiligde API die de
-- public_latitude/public_longitude afrondingen toepast.
-- Schrijven loopt via service role (geen directe client writes).
-- Geen SELECT policy = geen toegang via anon/JWT client.

-- ============================================================
-- Supabase Realtime inschakelen (handmatig in dashboard)
-- ============================================================
-- Ga naar: Table Editor → location_updates → Replication → Enable
-- Ga naar: Table Editor → player_sessions → Replication → Enable
-- Ga naar: Table Editor → player_point_progress → Replication → Enable
--
-- De admin-dashboard en spelerkaart luisteren via Realtime naar
-- INSERT/UPDATE events op deze tabellen. Zonder replication
-- werken de live updates niet, maar de 15s/10s polling valt
-- automatisch terug.
-- ============================================================

-- ============================================================
-- Environment variabelen checklist
-- ============================================================
-- .env.local (nooit committen):
--   NEXT_PUBLIC_SUPABASE_URL=       (publiek — ook in browser)
--   NEXT_PUBLIC_SUPABASE_ANON_KEY=  (publiek — ook in browser)
--   SUPABASE_SERVICE_ROLE_KEY=      (GEHEIM — alleen server-side)
--
-- Vercel project settings → Environment Variables: voeg alle
-- drie toe. Zorg dat SUPABASE_SERVICE_ROLE_KEY NIET als
-- NEXT_PUBLIC_ begint zodat hij nooit naar de browser lekt.
-- ============================================================
