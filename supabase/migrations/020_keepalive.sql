-- Losse tabel puur voor de GitHub Actions keep-alive ping. Los van echte data
-- (routes/sessies) zodat de ping geen bijwerkingen heeft op het spel zelf.
CREATE TABLE IF NOT EXISTS keepalive (
  id INTEGER PRIMARY KEY DEFAULT 1,
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT keepalive_single_row CHECK (id = 1)
);

ALTER TABLE keepalive ENABLE ROW LEVEL SECURITY;
-- Geen policies: alleen de service-role (gebruikt door de keep-alive workflow) kan hierbij,
-- die omzeilt RLS altijd. Dit is precies zo bedoeld — geen publieke toegang nodig.

INSERT INTO keepalive (id, pinged_at) VALUES (1, now())
ON CONFLICT (id) DO NOTHING;
