-- Plek waar een item werd ingezet (door de gebruiker) en waar het doelteam toen was,
-- zodat de kaart "gelopen route" en het rapport items op de juiste plek tonen.
ALTER TABLE item_log
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS doel_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS doel_longitude DOUBLE PRECISION;

NOTIFY pgrst, 'reload schema';
