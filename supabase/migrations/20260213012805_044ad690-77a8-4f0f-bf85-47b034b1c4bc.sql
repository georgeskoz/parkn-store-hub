
-- Create storage bucket for listing photos
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-photos', 'listing-photos', true);

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload listing photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'listing-photos' AND auth.uid() IS NOT NULL);

-- Allow anyone to view listing photos (public bucket)
CREATE POLICY "Anyone can view listing photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-photos');

-- Allow users to delete their own uploads (files stored under their user id folder)
CREATE POLICY "Users can delete own listing photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
