ALTER TABLE routes
  ADD COLUMN plekzooi_duur_seconden INTEGER NOT NULL DEFAULT 120 CHECK (plekzooi_duur_seconden > 0);
