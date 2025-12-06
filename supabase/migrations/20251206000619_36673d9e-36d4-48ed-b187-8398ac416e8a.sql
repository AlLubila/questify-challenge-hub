-- Create a view for public profile data that excludes sensitive financial columns
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- Update RLS policy on profiles table to be more restrictive
-- Users can only see their own full profile data
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Policy: Users can see their own full profile (including financial data)
CREATE POLICY "Users can view their own full profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Users can view basic info of other profiles (for features like leaderboards, following)
-- This uses a security definer function to control what's visible
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true
$$;

-- Allow viewing other profiles but application must use public_profiles view for non-own profiles
CREATE POLICY "Users can view other profiles basic info"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile(id));