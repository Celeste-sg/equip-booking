-- Grab: group QR image bucket. Only the owner writes, inside their own <uid>/ folder.
-- Who may READ the image is defined in the next migration (participants only).
-- Safe to re-run.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('grab-group', 'grab-group', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "grab_group_insert" ON storage.objects;
CREATE POLICY "grab_group_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'grab-group' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "grab_group_delete" ON storage.objects;
CREATE POLICY "grab_group_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'grab-group' AND (storage.foldername(name))[1] = auth.uid()::text);
