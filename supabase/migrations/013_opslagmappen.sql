-- Migratie 013: de opslagmappen in de migraties (4 november 2026)
--
-- Die zijn ooit met de hand aangemaakt; hiermee krijgt een nieuwe installatie ze ook. Bestaande mappen blijven
-- zoals ze zijn. Foto's van teams zijn niet openbaar (de app maakt er tijdelijke links voor).
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

INSERT INTO storage.buckets (id, name, public) VALUES
  ('route-afbeeldingen', 'route-afbeeldingen', true),
  ('vraag-afbeeldingen', 'vraag-afbeeldingen', true),
  ('vraag-geluid',       'vraag-geluid',       true),
  ('foto-inzendingen',   'foto-inzendingen',   false)
ON CONFLICT (id) DO NOTHING;
