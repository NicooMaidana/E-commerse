-- =============================================
-- Storage — bucket product-images
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Crear bucket público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,   -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lectura pública
CREATE POLICY "product_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Subida solo autenticados
CREATE POLICY "product_images_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

-- Actualización solo autenticados
CREATE POLICY "product_images_update_auth"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

-- Eliminación solo autenticados
CREATE POLICY "product_images_delete_auth"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
