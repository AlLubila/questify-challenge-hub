-- Keep public reads independent from privileged role helpers. The legacy
-- combined policy was evaluated for anonymous visitors and called a function
-- that is intentionally executable only by signed-in users.
DROP POLICY IF EXISTS "Approved submissions are viewable by everyone" ON public.submissions;
DROP POLICY IF EXISTS "Admins and moderators can view all submissions" ON public.submissions;

CREATE POLICY "Approved submissions are public"
ON public.submissions FOR SELECT TO anon, authenticated
USING (status = 'approved');

CREATE POLICY "Owners and staff can view submissions"
ON public.submissions FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR public.is_admin_or_moderator((SELECT auth.uid()))
);
