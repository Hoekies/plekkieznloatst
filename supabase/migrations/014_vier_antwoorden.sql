ALTER TABLE answer_options
  DROP CONSTRAINT answer_options_color_check;
ALTER TABLE answer_options
  ADD CONSTRAINT answer_options_color_check
  CHECK (color IN ('geel', 'blauw', 'rood', 'groen'));
