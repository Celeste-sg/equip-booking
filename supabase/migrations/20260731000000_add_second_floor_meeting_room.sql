-- Add the meeting room as a bookable resource. The name guard makes this
-- migration safe for environments where an admin has already added it.
INSERT INTO public.equipment (name, description, available)
SELECT '研究院二楼会议室', '研究院二楼会议室', true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.equipment
  WHERE name = '研究院二楼会议室'
);
