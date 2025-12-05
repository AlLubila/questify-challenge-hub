-- Fix profiles: Ensure only authenticated users can view
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Fix subscriptions: Remove overly permissive service role policy and add proper restrictions
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Users can only view their own subscription
-- The existing "Users can view their own subscription" policy already handles this correctly

-- Fix comments: Restrict to authenticated users
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

CREATE POLICY "Authenticated users can view comments"
ON public.comments
FOR SELECT
TO authenticated
USING (true);

-- Fix submission_votes: Restrict to authenticated users
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.submission_votes;

CREATE POLICY "Authenticated users can view votes"
ON public.submission_votes
FOR SELECT
TO authenticated
USING (true);

-- Fix follows: Restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;

CREATE POLICY "Authenticated users can view follows"
ON public.follows
FOR SELECT
TO authenticated
USING (true);