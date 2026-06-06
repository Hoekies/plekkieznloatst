ALTER TABLE special_items
  DROP CONSTRAINT special_items_type_check;
ALTER TABLE special_items
  ADD CONSTRAINT special_items_type_check
  CHECK (type IN ('spook','bom','ster','verdubbeling','wissel','dief','radar','banaan','plekzooi','vraagteken'));
