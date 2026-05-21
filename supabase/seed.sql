-- ============================================================
-- Testdata: Plekkie z'n Loatst
-- ============================================================
-- Vereiste voorbereiding (Supabase Dashboard → Authentication):
--   1. Maak een admin-gebruiker aan:
--        email: admin@plekkie.nl | wachtwoord: naar keuze
--        user_metadata: { "rol": "admin" }
--   2. Maak 3 speler-gebruikers aan:
--        groep1@plekkie.nl / groep2@plekkie.nl / groep3@plekkie.nl
--        user_metadata: { "rol": "speler" }
--   3. Voer daarna dit script uit in de Supabase SQL-editor.
--
-- ⚠️  Pas de UUIDs bij 'players' aan naar de echte auth.users.id's
--     van de aangemaakte speleraccounts.
-- ============================================================

-- ── Testroute ────────────────────────────────────────────────
INSERT INTO routes (id, name, status, is_active)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Rondwandeling Groningen Centrum',
  'gepubliceerd',
  false
);

-- ── Route-punten ─────────────────────────────────────────────
-- Punt 1: Informatiepunt – Groninger Museum
INSERT INTO route_points (id, route_id, order_index, type, name, description, latitude, longitude, radius_meters, points)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  1, 'informatiepunt',
  'Groninger Museum',
  'Het Groninger Museum is een kunstmuseum aan het Verbindingskanaal, direct tegenover het Hoofdstation. Het werd ontworpen door Alessandro Mendini en opende in 1994.',
  53.2092, 6.5639, 30, 0
);

-- Punt 2: Vraagpunt – Grote Markt
INSERT INTO route_points (id, route_id, order_index, type, name, description, latitude, longitude, radius_meters, points)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000001',
  2, 'vraagpunt',
  'Grote Markt',
  null,
  53.2192, 6.5675, 30, 10
);

-- Punt 3: Vraagpunt – Martinitoren
INSERT INTO route_points (id, route_id, order_index, type, name, description, latitude, longitude, radius_meters, points)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000001',
  3, 'vraagpunt',
  'Martinitoren',
  null,
  53.2196, 6.5683, 30, 15
);

-- Punt 4: Vraagpunt – Vismarkt
INSERT INTO route_points (id, route_id, order_index, type, name, description, latitude, longitude, radius_meters, points)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000001',
  4, 'vraagpunt',
  'Vismarkt',
  null,
  53.2176, 6.5678, 30, 10
);

-- Punt 5: Eindpunt – Hoofdstation
INSERT INTO route_points (id, route_id, order_index, type, name, description, latitude, longitude, radius_meters, points)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000005',
  'aaaaaaaa-0000-0000-0000-000000000001',
  5, 'eindpunt',
  'Hoofdstation Groningen',
  'Gefeliciteerd! Je hebt de rondwandeling door Groningen voltooid.',
  53.2102, 6.5639, 40, 5
);

-- ── Vragen ───────────────────────────────────────────────────
-- Vraag bij Grote Markt (meerkeuze tekst)
INSERT INTO questions (id, route_point_id, type, question_text, points)
VALUES (
  'cccccccc-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'meerkeuze_tekst',
  'Welk beeld staat er in het midden van de Grote Markt?',
  10
);
INSERT INTO answer_options (question_id, order_index, color, answer_type, text, is_correct) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 1, 'geel',  'tekst', 'De Drentse AA',     false),
  ('cccccccc-0000-0000-0000-000000000001', 2, 'blauw', 'tekst', 'Johan de Witt',     false),
  ('cccccccc-0000-0000-0000-000000000001', 3, 'rood',  'tekst', 'Prinses Beatrix',   false);
-- ⚠️  Vervang het bovenstaande door het echte antwoord en zet is_correct = true
--    (Hint: het is een standbeeld van een bekende Groningse figuur)

-- Vraag bij Martinitoren (open vraag – numeriek)
INSERT INTO questions (id, route_point_id, type, question_text, points, numeric_answer, numeric_tolerance)
VALUES (
  'cccccccc-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000003',
  'open',
  'Hoe hoog is de Martinitoren in meters? (afronden op hele meters)',
  15,
  97,
  2
);

-- Vraag bij Vismarkt (meerkeuze tekst)
INSERT INTO questions (id, route_point_id, type, question_text, points)
VALUES (
  'cccccccc-0000-0000-0000-000000000003',
  'bbbbbbbb-0000-0000-0000-000000000004',
  'meerkeuze_tekst',
  'Op welke dag van de week is er een grote markt op de Vismarkt?',
  10
);
INSERT INTO answer_options (question_id, order_index, color, answer_type, text, is_correct) VALUES
  ('cccccccc-0000-0000-0000-000000000003', 1, 'geel',  'tekst', 'Dinsdag',    false),
  ('cccccccc-0000-0000-0000-000000000003', 2, 'blauw', 'tekst', 'Donderdag',  true),
  ('cccccccc-0000-0000-0000-000000000003', 3, 'rood',  'tekst', 'Zaterdag',   false);

-- ── Testspelers ──────────────────────────────────────────────
-- ⚠️  Vervang de UUIDs hieronder door de echte auth.users.id's
--    van de speleraccounts die je in Supabase Auth aanmaakte.
INSERT INTO players (id, group_name, auth_user_id) VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'Groep 1', '2e677cb9-c1a7-42f3-899a-7e64c274e426'),
  ('dddddddd-0000-0000-0000-000000000002', 'Groep 2', 'e74f7c97-e04d-4edb-aebf-090f9cc8e290'),
  ('dddddddd-0000-0000-0000-000000000003', 'Groep 3', '60380215-8c58-4ee1-9c5e-e2c79a7a88e2');
