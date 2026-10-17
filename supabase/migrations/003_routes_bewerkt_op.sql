-- "Laatst aangepast" per route: alleen echte bewerkingen in de editor tellen mee
-- (naam, instellingen, punten, vragen, antwoorden en geplaatste items), niet wat er tijdens
-- het spelen verandert (activeren, tussenstand, uitslag, opgepakte items, startitems).
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS bewerkt_op timestamptz NOT NULL DEFAULT now();

-- Startwaarde voor bestaande routes: de laatste wijziging aan punten of vragen (anders het aanmaken)
UPDATE routes r SET bewerkt_op = greatest(
  r.created_at,
  coalesce((SELECT max(rp.updated_at) FROM route_points rp WHERE rp.route_id = r.id), r.created_at),
  coalesce((SELECT max(q.updated_at) FROM questions q JOIN route_points rp ON rp.id = q.route_point_id WHERE rp.route_id = r.id), r.created_at),
  coalesce((SELECT max(si.created_at) FROM special_items si WHERE si.route_id = r.id AND NOT si.is_startitem), r.created_at)
);

-- Route zelf: alleen bijwerken als er iets anders verandert dan de spel-velden
CREATE OR REPLACE FUNCTION route_bewerkt_op() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  spelvelden text[] := ARRAY['updated_at', 'bewerkt_op', 'is_active', 'status', 'tussenstand_trigger_at',
                              'uitslag_vrijgegeven', 'items_last_rotated_at'];
BEGIN
  IF (to_jsonb(NEW) - spelvelden) IS DISTINCT FROM (to_jsonb(OLD) - spelvelden) THEN
    NEW.bewerkt_op := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS routes_bewerkt_op ON routes;
CREATE TRIGGER routes_bewerkt_op BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION route_bewerkt_op();

-- Hulpje: de route van een wijziging een nieuwe "bewerkt op" geven
CREATE OR REPLACE FUNCTION markeer_route_bewerkt(rid uuid) RETURNS void LANGUAGE sql AS $$
  UPDATE routes SET bewerkt_op = now() WHERE id = rid;
$$;

-- Punten
CREATE OR REPLACE FUNCTION punt_bewerkt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM markeer_route_bewerkt(coalesce(NEW.route_id, OLD.route_id));
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS route_points_bewerkt ON route_points;
CREATE TRIGGER route_points_bewerkt AFTER INSERT OR UPDATE OR DELETE ON route_points FOR EACH ROW EXECUTE FUNCTION punt_bewerkt();

-- Vragen
CREATE OR REPLACE FUNCTION vraag_bewerkt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM markeer_route_bewerkt((SELECT route_id FROM route_points WHERE id = coalesce(NEW.route_point_id, OLD.route_point_id)));
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS questions_bewerkt ON questions;
CREATE TRIGGER questions_bewerkt AFTER INSERT OR UPDATE OR DELETE ON questions FOR EACH ROW EXECUTE FUNCTION vraag_bewerkt();

-- Antwoorden
CREATE OR REPLACE FUNCTION antwoord_bewerkt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM markeer_route_bewerkt((
    SELECT rp.route_id FROM questions q JOIN route_points rp ON rp.id = q.route_point_id
    WHERE q.id = coalesce(NEW.question_id, OLD.question_id)));
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS answer_options_bewerkt ON answer_options;
CREATE TRIGGER answer_options_bewerkt AFTER INSERT OR UPDATE OR DELETE ON answer_options FOR EACH ROW EXECUTE FUNCTION antwoord_bewerkt();

-- Items: plaatsen, verplaatsen, aanpassen en verwijderen tellen; oppakken, inzetten,
-- terugkomen en startitems (die horen bij het spelen) niet
CREATE OR REPLACE FUNCTION item_bewerkt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT NEW.is_startitem THEN PERFORM markeer_route_bewerkt(NEW.route_id); END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT OLD.is_startitem THEN PERFORM markeer_route_bewerkt(OLD.route_id); END IF;
  ELSIF NOT NEW.is_startitem AND (NEW.type, NEW.name, NEW.latitude, NEW.longitude, NEW.radius_meters, NEW.points_effect)
        IS DISTINCT FROM (OLD.type, OLD.name, OLD.latitude, OLD.longitude, OLD.radius_meters, OLD.points_effect) THEN
    PERFORM markeer_route_bewerkt(NEW.route_id);
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS special_items_bewerkt ON special_items;
CREATE TRIGGER special_items_bewerkt AFTER INSERT OR UPDATE OR DELETE ON special_items FOR EACH ROW EXECUTE FUNCTION item_bewerkt();

NOTIFY pgrst, 'reload schema';
