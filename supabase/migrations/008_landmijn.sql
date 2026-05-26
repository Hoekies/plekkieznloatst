-- Plek zooi special item (onzichtbare blokkeer-val)

-- 1. Plek zooi toevoegen aan special_items type
ALTER TABLE special_items
  DROP CONSTRAINT special_items_type_check;
ALTER TABLE special_items
  ADD CONSTRAINT special_items_type_check
  CHECK (type IN ('spook','bom','ster','verdubbeling','wissel','dief','radar','banaan','plekzooi'));

-- 2. Plek zooi toevoegen aan special_item_effects effect_type
ALTER TABLE special_item_effects
  DROP CONSTRAINT special_item_effects_effect_type_check;
ALTER TABLE special_item_effects
  ADD CONSTRAINT special_item_effects_effect_type_check
  CHECK (effect_type IN ('ghost','punt_aftrek','verdubbeling','wissel','diefstal','radar','banaan','plekzooi'));
