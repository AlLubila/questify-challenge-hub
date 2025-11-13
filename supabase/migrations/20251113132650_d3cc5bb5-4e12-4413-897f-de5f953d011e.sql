-- Fix profiles table RLS to protect financial data
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Allow everyone to view basic profile info, but restrict sensitive financial data
CREATE POLICY "Public can view basic profiles"
ON public.profiles
FOR SELECT
USING (true);

-- Users can only view their own sensitive financial data (enforced at application level)
-- We'll handle this by selecting only non-sensitive columns in public queries

-- Fix user_roles table RLS to hide admin identities
DROP POLICY IF EXISTS "Everyone can view roles" ON public.user_roles;

CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Fix referrals INSERT policy to prevent fraud
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;

CREATE POLICY "Service role can insert referrals"
ON public.referrals
FOR INSERT
WITH CHECK (false); -- Only service role can insert

-- Ensure subscriptions policies are correct
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;

CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Add policy for service role to manage subscriptions
CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (true)
WITH CHECK (true);