DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public can view listing photos'
  ) THEN
    CREATE POLICY "Public can view listing photos"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'listing-photos');
  END IF;
END $$;