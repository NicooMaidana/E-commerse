-- =============================================
-- Row Level Security — Alta GULA Delivery
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticker_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs      ENABLE ROW LEVEL SECURITY;

-- ── Tablas públicas (lectura libre, escritura solo autenticados) ──

-- CATEGORIES
CREATE POLICY "categories_select_public"
  ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_auth"
  ON categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "categories_update_auth"
  ON categories FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "categories_delete_auth"
  ON categories FOR DELETE USING (auth.uid() IS NOT NULL);

-- PRODUCTS
CREATE POLICY "products_select_public"
  ON products FOR SELECT USING (true);
CREATE POLICY "products_insert_auth"
  ON products FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "products_update_auth"
  ON products FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_delete_auth"
  ON products FOR DELETE USING (auth.uid() IS NOT NULL);

-- COMBOS
CREATE POLICY "combos_select_public"
  ON combos FOR SELECT USING (true);
CREATE POLICY "combos_insert_auth"
  ON combos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "combos_update_auth"
  ON combos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "combos_delete_auth"
  ON combos FOR DELETE USING (auth.uid() IS NOT NULL);

-- COMBO_ITEMS
CREATE POLICY "combo_items_select_public"
  ON combo_items FOR SELECT USING (true);
CREATE POLICY "combo_items_insert_auth"
  ON combo_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "combo_items_update_auth"
  ON combo_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "combo_items_delete_auth"
  ON combo_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- TICKER_MESSAGES
CREATE POLICY "ticker_messages_select_public"
  ON ticker_messages FOR SELECT USING (true);
CREATE POLICY "ticker_messages_insert_auth"
  ON ticker_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ticker_messages_update_auth"
  ON ticker_messages FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ticker_messages_delete_auth"
  ON ticker_messages FOR DELETE USING (auth.uid() IS NOT NULL);

-- SETTINGS
CREATE POLICY "settings_select_public"
  ON settings FOR SELECT USING (true);
CREATE POLICY "settings_insert_auth"
  ON settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "settings_update_auth"
  ON settings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "settings_delete_auth"
  ON settings FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── Tablas restringidas (solo usuarios autenticados) ──

-- STOCK_LOGS
CREATE POLICY "stock_logs_auth_all"
  ON stock_logs FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
