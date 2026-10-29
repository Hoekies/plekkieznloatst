-- Migratie 007: 🎉 spelplezier (29 oktober 2026)
--
-- Per route aan of uit (route-editor → Instellingen → Spel):
--   🪤 val          een team legt een bom neer als verborgen val; wie erin loopt verliest punten
--   🔥 reeks        3 goede antwoorden op rij = een bonus-item
--   🎖️ badges       kleine prijzen tijdens het spel (Pionier, On fire, Schatzoekers …)
--   📸 fotobattle   na de finish stemmen de teams op de mooiste finishfoto
--   📦 schat        een vliegende schat op de kaart die elke 10 minuten verhuist
--   🎰 rad          halverwege draait elk team één keer aan het rad van fortuin
-- En ⏰ gouden kwartier: de spelleider zet 15 minuten dubbele punten aan (knop in het Spelleider-blok).
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS val_aan        boolean NOT NULL DEFAULT false;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS reeks_aan      boolean NOT NULL DEFAULT false;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS badges_aan     boolean NOT NULL DEFAULT false;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS fotobattle_aan boolean NOT NULL DEFAULT false;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS schat_aan      boolean NOT NULL DEFAULT false;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS rad_aan        boolean NOT NULL DEFAULT false;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS gouden_tot     timestamptz;          -- ⏰ tot wanneer de punten dubbel tellen

ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS reeks           integer NOT NULL DEFAULT 0;   -- 🔥 goede antwoorden op rij
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS rad_gedraaid_op timestamptz;                  -- 🎰 één keer per spel
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS rad_uitkomst    text;

-- 🪤 Vallen: een bom die een team op zijn eigen plek neerlegde. Alleen dat team ziet hem.
CREATE TABLE IF NOT EXISTS vallen (
  id             uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id       uuid             NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  sessie_id      uuid             NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,  -- wie hem zette
  item_id        uuid             REFERENCES special_items(id) ON DELETE SET NULL,           -- de bom die het werd
  latitude       double precision NOT NULL,
  longitude      double precision NOT NULL,
  punten         integer          NOT NULL DEFAULT 30,
  gezet_op       timestamptz      NOT NULL DEFAULT now(),
  verloopt_op    timestamptz      NOT NULL,
  geraakt_sessie uuid             REFERENCES player_sessions(id) ON DELETE SET NULL,
  geraakt_op     timestamptz
);
CREATE INDEX IF NOT EXISTS vallen_route ON vallen (route_id);
CREATE INDEX IF NOT EXISTS vallen_sessie ON vallen (sessie_id);

-- 🎖️ Badges: per spel elke soort hooguit één keer
CREATE TABLE IF NOT EXISTS badges (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sessie_id  uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  soort      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sessie_id, soort)
);

-- 📸 Fotobattle: elk team één stem (aan te passen tot de uitslag), nooit op de eigen foto
CREATE TABLE IF NOT EXISTS fotobattle_stemmen (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id     uuid        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  kiezer_sessie uuid       NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  foto_sessie  uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, kiezer_sessie)
);

-- 📦 Vliegende schat: per blok van 10 minuten één schat (test en echt apart), zodat twee verzoeken tegelijk er
-- nooit twee maken
CREATE TABLE IF NOT EXISTS schatten (
  id         uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id   uuid             NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  slot       bigint           NOT NULL,              -- blok van 10 minuten (epoch / 600)
  test       boolean          NOT NULL DEFAULT false,
  latitude   double precision NOT NULL,
  longitude  double precision NOT NULL,
  gepakt_door uuid            REFERENCES player_sessions(id) ON DELETE SET NULL,
  gepakt_op  timestamptz,
  item_type  text,
  UNIQUE (route_id, slot, test)
);

-- Alleen de server (service_role) komt erbij; spelers krijgen alles via de app
ALTER TABLE vallen             ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotobattle_stemmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE schatten           ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vallen             TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges             TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fotobattle_stemmen TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schatten           TO service_role;

NOTIFY pgrst, 'reload schema';
