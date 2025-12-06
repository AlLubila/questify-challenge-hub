-- Drop and recreate the view without SECURITY DEFINER
-- Views by default use the permissions of the querying user which is more secure
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  username,
  display_name,
  avatar_url,
  bio,
  points,
  xp,
  level,
  followers_count,
  following_count,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;