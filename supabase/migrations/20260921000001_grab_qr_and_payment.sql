-- Grab: pickup QR uploads + payment tracking.
-- Run in the Supabase SQL editor after 20260921000000_add_grab.sql.

ALTER TABLE public.grab_participants
  ADD COLUMN qr_path text,
  ADD COLUMN paid boolean NOT NULL DEFAULT false;

-- Private buckets: nothing is public; the app reads files through signed URLs.
--   grab-qr  : pickup QR screenshots uploaded by participants (5 MB, images only)
--   grab-pay : the organiser's payment QR codes. Upload alipay.jpeg and wechat.jpeg
--              by hand in Dashboard > Storage > grab-pay (they must NOT go in the public git repo).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('grab-qr',  'grab-qr',  false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('grab-pay', 'grab-pay', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- grab-qr: any logged-in user can view (creators need to see them); users may only
-- write/delete inside their own <uid>/ folder.
CREATE POLICY "grab_qr_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'grab-qr');
CREATE POLICY "grab_qr_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'grab-qr' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "grab_qr_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'grab-qr' AND (storage.foldername(name))[1] = auth.uid()::text);

-- grab-pay: read-only for logged-in users.
CREATE POLICY "grab_pay_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'grab-pay');
