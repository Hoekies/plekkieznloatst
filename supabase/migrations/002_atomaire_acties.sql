-- Migratie 002: scores en puntvolgorde in één keer bijwerken (audits 26 oktober 2026: F01, F02, I01, I03)
--
-- Tot nu toe las de app een score, rekende er iets bij en schreef het totaal terug. Gebeurden twee dingen
-- tegelijk (een antwoord en een bom), dan ging één van de twee verloren. Deze functies doen het in één stap
-- in de database. Ook de banaan (twee punten van plek ruilen) werkt hiermee: twee losse updates botsten op de
-- unieke regel van session_point_order.
--
-- Alleen de server (service_role) mag ze aanroepen. Mag vaker gedraaid worden. Zonder deze migratie werkt de
-- app op de oude manier verder (de Systeemcheck meldt het).

-- Punten erbij (negatief = eraf); geeft de nieuwe score terug
CREATE OR REPLACE FUNCTION public.pr_score_bij(p_sessie uuid, p_delta integer)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE player_sessions SET score = score + p_delta WHERE id = p_sessie RETURNING score;
$$;

-- 🔄 Wissel: twee teams ruilen hun score
CREATE OR REPLACE FUNCTION public.pr_score_wissel(p_a uuid, p_b uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE sa integer; sb integer;
BEGIN
  -- Altijd in dezelfde volgorde vergrendelen: twee wissels tegelijk kunnen elkaar dan niet blokkeren
  PERFORM 1 FROM player_sessions WHERE id IN (p_a, p_b) ORDER BY id FOR UPDATE;
  SELECT score INTO sa FROM player_sessions WHERE id = p_a;
  SELECT score INTO sb FROM player_sessions WHERE id = p_b;
  IF sa IS NULL OR sb IS NULL THEN RAISE EXCEPTION 'Sessie niet gevonden'; END IF;
  UPDATE player_sessions SET score = sb WHERE id = p_a;
  UPDATE player_sessions SET score = sa WHERE id = p_b;
END;
$$;

-- 🦹 Dief: hoogstens p_max punten van het ene team naar het andere, nooit meer dan het slachtoffer heeft.
-- Geeft terug hoeveel er echt is overgeboekt.
CREATE OR REPLACE FUNCTION public.pr_score_overboeken(p_van uuid, p_naar uuid, p_max integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE sv integer; n integer;
BEGIN
  PERFORM 1 FROM player_sessions WHERE id IN (p_van, p_naar) ORDER BY id FOR UPDATE;
  SELECT score INTO sv FROM player_sessions WHERE id = p_van;
  IF sv IS NULL OR NOT EXISTS (SELECT 1 FROM player_sessions WHERE id = p_naar) THEN RAISE EXCEPTION 'Sessie niet gevonden'; END IF;
  n := GREATEST(0, LEAST(p_max, sv));
  UPDATE player_sessions SET score = score - n WHERE id = p_van;
  UPDATE player_sessions SET score = score + n WHERE id = p_naar;
  RETURN n;
END;
$$;

-- 🍌 Banaan: twee plekken in de volgorde van een team ruilen. Via een tijdelijke plek (-1), zodat de unieke
-- regels (sessie + volgorde, sessie + punt) nergens botsen.
CREATE OR REPLACE FUNCTION public.pr_punten_ruilen(p_sessie uuid, p_volgorde_a integer, p_volgorde_b integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE session_point_order SET volgorde = -1 WHERE session_id = p_sessie AND volgorde = p_volgorde_a;
  IF NOT FOUND THEN RAISE EXCEPTION 'Punt % niet gevonden', p_volgorde_a; END IF;
  UPDATE session_point_order SET volgorde = p_volgorde_a WHERE session_id = p_sessie AND volgorde = p_volgorde_b;
  IF NOT FOUND THEN RAISE EXCEPTION 'Punt % niet gevonden', p_volgorde_b; END IF;
  UPDATE session_point_order SET volgorde = p_volgorde_b WHERE session_id = p_sessie AND volgorde = -1;
END;
$$;

REVOKE ALL ON FUNCTION public.pr_score_bij(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pr_score_wissel(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pr_score_overboeken(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pr_punten_ruilen(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pr_score_bij(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.pr_score_wissel(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pr_score_overboeken(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.pr_punten_ruilen(uuid, integer, integer) TO service_role;

-- Eén vraag per punt (audit QA03): twee keer tegelijk "opslaan" kon twee vragen aan één punt hangen, en dan
-- werd het punt zonder vraag afgerond. Alleen aanmaken als er nu geen dubbele zijn (op 28 oktober 2026: 0).
DO $$
BEGIN
  IF NOT EXISTS (SELECT route_point_id FROM questions GROUP BY route_point_id HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS questions_route_point_uniek ON questions (route_point_id);
  ELSE
    RAISE NOTICE 'Er zijn punten met twee vragen: ruim die eerst op, dan deze migratie opnieuw draaien';
  END IF;
END $$;

-- Laat PostgREST de nieuwe functies meteen zien
NOTIFY pgrst, 'reload schema';
