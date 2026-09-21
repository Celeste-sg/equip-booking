-- Payment codes accept the same image formats as pickup QR uploads (incl. iPhone HEIC).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
WHERE id = 'grab-pay';
