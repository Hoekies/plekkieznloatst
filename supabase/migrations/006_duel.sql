-- Migratie 006: ⚔️ duel (29 oktober 2026)
--
-- Komen twee teams binnen 25 meter van elkaar, dan krijgen ze allebei dezelfde snelle vraag. Wie het eerst goed
-- antwoordt, pakt punten van de ander. Per route aan of uit (route-editor → Instellingen → Spel).
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS duel_aan boolean NOT NULL DEFAULT false;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS duel_punten integer NOT NULL DEFAULT 25;

CREATE TABLE IF NOT EXISTS duels (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id       uuid        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  sessie_a       uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,  -- altijd de kleinste id van de twee
  sessie_b       uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  vraag_nr       integer     NOT NULL,                     -- welke vraag uit lib/duel-vragen.ts
  punten         integer     NOT NULL DEFAULT 25,
  gestart_op     timestamptz NOT NULL DEFAULT now(),
  antwoord_a     integer,
  antwoord_b     integer,
  winnaar        uuid,                                     -- de sessie die het eerst goed was (null = niemand)
  buit           integer     NOT NULL DEFAULT 0,           -- zoveel punten gingen echt over
  afgerond_op    timestamptz                               -- klaar: iemand won, allebei fout of de tijd is om
);
CREATE INDEX IF NOT EXISTS duels_sessie_a ON duels (sessie_a);
CREATE INDEX IF NOT EXISTS duels_sessie_b ON duels (sessie_b);
-- Nooit twee open duels tegelijk tussen dezelfde twee teams
CREATE UNIQUE INDEX IF NOT EXISTS duels_een_open ON duels (sessie_a, sessie_b) WHERE afgerond_op IS NULL;

-- Alleen de server (service_role) komt erbij; spelers krijgen alles via de app
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.duels TO service_role;

NOTIFY pgrst, 'reload schema';
