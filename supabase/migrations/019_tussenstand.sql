ALTER TABLE routes
  ADD COLUMN tussenstand_interval_minuten INTEGER NOT NULL DEFAULT 0 CHECK (tussenstand_interval_minuten >= 0),
  ADD COLUMN tussenstand_duur_seconden INTEGER NOT NULL DEFAULT 10 CHECK (tussenstand_duur_seconden > 0),
  ADD COLUMN tussenstand_trigger_at TIMESTAMPTZ;
