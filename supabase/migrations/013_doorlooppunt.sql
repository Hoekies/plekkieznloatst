-- Nieuwe soort punt: "doorlooppunt" (🚶 Doorlopen). De speler krijgt hier geen scherm; het punt
-- telt vanzelf als gepasseerd en het volgende punt verschijnt. Naast vraagpunt, informatiepunt en eindpunt.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE route_points DROP CONSTRAINT IF EXISTS route_points_type_check;
ALTER TABLE route_points ADD CONSTRAINT route_points_type_check
  CHECK (type IN ('vraagpunt', 'informatiepunt', 'eindpunt', 'doorlooppunt'));
