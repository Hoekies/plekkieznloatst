-- Eigen huisstijl per route (kleur, logo, welkomstfoto), een geluidset per route en de stemvraag.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

-- 🎨 Huisstijl: leeg = de gewone PointRush-stijl
ALTER TABLE routes ADD COLUMN IF NOT EXISTS huisstijl_kleur text;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS huisstijl_logo_pad text;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS welkom_foto_pad text;
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_huisstijl_kleur_check;
ALTER TABLE routes ADD CONSTRAINT routes_huisstijl_kleur_check
  CHECK (huisstijl_kleur IS NULL OR huisstijl_kleur ~ '^#[0-9A-Fa-f]{6}$');

-- 🔔 Geluidset voor goed, fout, punt bereikt en finish
ALTER TABLE routes ADD COLUMN IF NOT EXISTS geluid_set text NOT NULL DEFAULT 'klassiek';
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_geluid_set_check;
ALTER TABLE routes ADD CONSTRAINT routes_geluid_set_check
  CHECK (geluid_set IN ('klassiek', 'arcade', 'zacht', 'feest'));

-- 🗳️ Stemvraag: de teams stemmen; wie met de meerderheid meestemde krijgt de punten zodra de stemming sluit
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_type_check
  CHECK (type IN ('meerkeuze_tekst', 'meerkeuze_afbeelding', 'open', 'foto_opdracht', 'stemvraag'));
ALTER TABLE questions ADD COLUMN IF NOT EXISTS stem_gesloten boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
