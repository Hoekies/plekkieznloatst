-- Beveiliging: spelers mogen hun eigen gegevens alleen LEZEN met de openbare sleutel.
--
-- Waarom: de app zelf schrijft altijd via de server (service-role). Maar een speler kan met zijn
-- eigen inlog ook rechtstreeks met de database praten, buiten de app om. Met de oude regels kon
-- hij dan zijn eigen score, voortgang en foto-keuring aanpassen (valsspelen), of zichzelf weer
-- inschakelen na "uitgeschakeld". De live-updates in de app hebben alleen leesrechten nodig.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

-- Functies: vaste zoekpad (aanbevolen bij SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION mijn_player_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM players WHERE auth_user_id = auth.uid();
$$;

-- 1. Alle schrijfregels voor spelers weghalen (de admin-regels blijven staan)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('players', 'player_sessions', 'player_point_progress', 'foto_inzendingen', 'location_updates')
      AND cmd <> 'SELECT'
      AND policyname NOT LIKE '%admin%'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2. Leesregels voor de eigen gegevens (nodig voor de live-updates in de app)
DROP POLICY IF EXISTS "player_sessions_speler_eigen_lezen" ON player_sessions;
CREATE POLICY "player_sessions_speler_eigen_lezen" ON player_sessions FOR SELECT TO authenticated
  USING (NOT is_admin() AND player_id = mijn_player_id());

DROP POLICY IF EXISTS "progress_speler_eigen_lezen" ON player_point_progress;
CREATE POLICY "progress_speler_eigen_lezen" ON player_point_progress FOR SELECT TO authenticated
  USING (NOT is_admin() AND session_id IN (SELECT id FROM player_sessions WHERE player_id = mijn_player_id()));

DROP POLICY IF EXISTS "foto_inzendingen_speler_eigen_lezen" ON foto_inzendingen;
CREATE POLICY "foto_inzendingen_speler_eigen_lezen" ON foto_inzendingen FOR SELECT TO authenticated
  USING (NOT is_admin() AND session_id IN (SELECT id FROM player_sessions WHERE player_id = mijn_player_id()));

-- 3. Oude weergave met (afgeronde) posities van alle spelers: wordt niet meer gebruikt
DROP VIEW IF EXISTS public_locaties;

-- 4. Controle: hieronder mogen voor spelers alleen nog SELECT-regels staan
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('players', 'player_sessions', 'player_point_progress', 'foto_inzendingen', 'location_updates')
ORDER BY tablename, policyname;
