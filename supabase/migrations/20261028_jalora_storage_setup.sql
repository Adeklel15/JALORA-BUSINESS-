-- ==============================================================================
-- JALORA BUSINESS MANAGEMENT PLATFORM — DEDICATED SUPABASE STORAGE SETUP
-- Author: Abdul Jalil
-- Platform: JALORA
-- Buckets: 'logos' (public), 'store-logos' (public), 'product-images' (public)
-- Security: Multi-tenant store isolation with public read and strict member RLS
-- ==============================================================================

-- 1. PROVISION STORAGE BUCKETS (IDEMPOTENT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('logos', 'logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('store-logos', 'store-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('product-images', 'product-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. HELPER FUNCTIONS TO VALIDATE STORE MEMBERSHIP FOR STORAGE OBJECTS
-- Object path format: {store_id}/{filename} or {store_id}/products/{filename}
CREATE OR REPLACE FUNCTION public.is_member_of_store(check_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_memberships
    WHERE user_id = auth.uid()
      AND store_id = check_store_id
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_storage_object(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_segment TEXT;
  target_store_id UUID;
BEGIN
  -- Pengguna wajib terautentikasi
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Ekstrak store_id dari segmen pertama path {store_id}/...
  first_segment := split_part(object_name, '/', 1);
  BEGIN
    target_store_id := first_segment::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- Bukan format UUID store_id yang valid
    RETURN FALSE;
  END;

  -- Validasi keanggotaan aktif pengguna pada store_id tersebut
  RETURN public.is_member_of_store(target_store_id);
END;
$$;

-- 3. ROW LEVEL SECURITY (RLS) POLICIES ON storage.objects

-- A. Public Read: Logos & product images dapat dilihat publik untuk struk, monitor pelanggan, & etalase
DROP POLICY IF EXISTS "Public can view logos and product images" ON storage.objects;
CREATE POLICY "Public can view logos and product images"
ON storage.objects FOR SELECT
USING (bucket_id IN ('logos', 'store-logos', 'product-images'));

-- B. Authenticated Store Member Upload (INSERT): Hanya untuk anggota aktif toko pemilik path {store_id}
DROP POLICY IF EXISTS "Authenticated store members can upload objects" ON storage.objects;
CREATE POLICY "Authenticated store members can upload objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('logos', 'store-logos', 'product-images')
  AND public.can_manage_storage_object(name)
);

-- C. Authenticated Store Member Update (UPDATE): Hanya untuk anggota aktif toko pemilik path {store_id}
DROP POLICY IF EXISTS "Authenticated store members can update objects" ON storage.objects;
CREATE POLICY "Authenticated store members can update objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('logos', 'store-logos', 'product-images')
  AND public.can_manage_storage_object(name)
)
WITH CHECK (
  bucket_id IN ('logos', 'store-logos', 'product-images')
  AND public.can_manage_storage_object(name)
);

-- D. Authenticated Store Member Delete (DELETE): Hanya untuk anggota aktif toko pemilik path {store_id}
DROP POLICY IF EXISTS "Authenticated store members can delete objects" ON storage.objects;
CREATE POLICY "Authenticated store members can delete objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('logos', 'store-logos', 'product-images')
  AND public.can_manage_storage_object(name)
);

-- 4. CONFIRMATION
DO $$
BEGIN
  RAISE NOTICE 'JALORA Supabase Storage buckets ("logos", "store-logos", "product-images") dan kebijakan RLS ketat berbasis store_id berhasil diperbarui.';
END $$;
