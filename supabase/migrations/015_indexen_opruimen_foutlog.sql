-- Snellere zoekopdrachten (indexen), oude GPS-plekken na 30 dagen automatisch weg (AVG),
-- en een logboek van fouten die spelers en beheerders in de app tegenkomen.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

-- ── Indexen ─────────────────────────────────────────────────────────────────
-- Laatste plek en spoor per team (live kaart, dashboard, gelopen route)
CREATE INDEX IF NOT EXISTS location_updates_sessie_tijd_idx ON location_updates (session_id, created_at DESC);
-- Voortgang van één team bij één punt (bij elk bereikt punt en elk antwoord)
CREATE INDEX IF NOT EXISTS player_point_progress_sessie_punt_idx ON player_point_progress (session_id, route_point_id);
-- Punten van een route op volgorde
CREATE INDEX IF NOT EXISTS route_points_route_volgorde_idx ON route_points (route_id, order_index);
-- Lopende aanvallen op een team (spook, plek zooi)
CREATE INDEX IF NOT EXISTS special_item_effects_doel_tot_idx ON special_item_effects (target_session_id, expires_at);
-- Sessies van de actieve route per status
CREATE INDEX IF NOT EXISTS player_sessions_route_status_idx ON player_sessions (route_id, status);

-- ── Foutlogboek ─────────────────────────────────────────────────────────────
-- Alleen de server (service role) schrijft en leest; spelers en beheerders gaan via de API.
CREATE TABLE IF NOT EXISTS client_fouten (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  rol         text,                 -- admin, helper of speler
  wie         text,                 -- inlognaam of e-mail, om de fout terug te vinden
  pad         text,                 -- pagina waar het gebeurde
  bericht     text        NOT NULL,
  details     text,                 -- stack (ingekort)
  browser     text
);
CREATE INDEX IF NOT EXISTS client_fouten_tijd_idx ON client_fouten (created_at DESC);
ALTER TABLE client_fouten ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_fouten TO service_role;

-- ── Opruimen ────────────────────────────────────────────────────────────────
-- GPS-plekken en foutmeldingen ouder dan 30 dagen weg. Nu meteen, en daarna elke nacht om 03:00
-- (met pg_cron; lukt dat niet, dan gewoon een melding en ruimt de Systeemcheck-knop het op).
DELETE FROM location_updates WHERE created_at < now() - interval '30 days';
DELETE FROM client_fouten WHERE created_at < now() - interval '30 days';

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'pointrush-opruimen';
  PERFORM cron.schedule('pointrush-opruimen', '0 3 * * *', $job$
    DELETE FROM public.location_updates WHERE created_at < now() - interval '30 days';
    DELETE FROM public.client_fouten WHERE created_at < now() - interval '30 days';
  $job$);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Automatisch opruimen niet ingesteld (%): gebruik de knop in de Systeemcheck', SQLERRM;
END $$;
