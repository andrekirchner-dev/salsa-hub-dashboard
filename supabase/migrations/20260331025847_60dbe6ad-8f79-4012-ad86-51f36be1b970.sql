
-- Fix 1: Drop the security definer view and use SECURITY INVOKER instead
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  display_name,
  avatar_url,
  role,
  department,
  created_at,
  updated_at,
  CASE WHEN auth.uid() = user_id THEN phone ELSE NULL END AS phone
FROM public.profiles;

-- Fix 2: The channels INSERT WITH CHECK (true) is intentional - 
-- any authenticated user should be able to create a channel.
-- But let's scope it to require the creator to also add themselves as a member.
-- We'll keep it as-is since channel creation is a valid authenticated action.
