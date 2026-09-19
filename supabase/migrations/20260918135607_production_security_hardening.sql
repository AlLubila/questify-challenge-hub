-- Production security hardening for profiles, submissions, referrals and billing.
-- This migration is intentionally additive/non-destructive except for replacing
-- unsafe policies and functions with equivalent guarded versions.

-- ---------------------------------------------------------------------------
-- Public/private profile boundary
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view other profiles basic info" ON public.profiles;

DROP FUNCTION IF EXISTS public.can_view_profile(uuid);

CREATE POLICY "Users can view their own full profile"
ON public.profiles FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = id);

CREATE POLICY "Staff can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin_or_moderator((SELECT auth.uid())));

DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_barrier = true) AS
SELECT
  id, username, display_name, avatar_url, bio, points, xp, level,
  followers_count, following_count, created_at, updated_at
FROM public.profiles;

REVOKE ALL ON public.public_profiles FROM PUBLIC;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_managed_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) = OLD.id
     AND NOT public.is_admin_or_moderator((SELECT auth.uid()))
     AND (
       NEW.points IS DISTINCT FROM OLD.points OR
       NEW.xp IS DISTINCT FROM OLD.xp OR
       NEW.level IS DISTINCT FROM OLD.level OR
       NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance OR
       NEW.referral_count IS DISTINCT FROM OLD.referral_count OR
       NEW.referral_earnings IS DISTINCT FROM OLD.referral_earnings OR
       NEW.referred_by IS DISTINCT FROM OLD.referred_by OR
       NEW.referral_code IS DISTINCT FROM OLD.referral_code OR
       NEW.followers_count IS DISTINCT FROM OLD.followers_count OR
       NEW.following_count IS DISTINCT FROM OLD.following_count
     ) THEN
    RAISE EXCEPTION 'Managed profile fields cannot be changed by clients'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_managed_fields ON public.profiles;
CREATE TRIGGER protect_profile_managed_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_managed_fields();

REVOKE EXECUTE ON FUNCTION public.increment_points(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_referral() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Submission state is server/staff managed
-- ---------------------------------------------------------------------------
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS rewarded_at timestamptz;

DROP POLICY IF EXISTS "Users can update their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Admins and moderators can update any submission" ON public.submissions;

CREATE POLICY "Owners can edit submission content"
ON public.submissions FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Staff can update submissions"
ON public.submissions FOR UPDATE TO authenticated
USING (public.is_admin_or_moderator((SELECT auth.uid())))
WITH CHECK (public.is_admin_or_moderator((SELECT auth.uid())));

CREATE OR REPLACE FUNCTION public.guard_submission_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND (SELECT auth.uid()) IS NOT NULL
     AND NOT public.is_admin_or_moderator((SELECT auth.uid())) THEN
    NEW.user_id := (SELECT auth.uid());
    NEW.status := 'pending';
    NEW.moderation_status := 'pending_review';
    NEW.moderation_flags := NULL;
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
    NEW.votes := 0;
    NEW.boost_level := 'none';
    NEW.rewarded_at := NULL;
  ELSIF TG_OP = 'UPDATE'
     AND (SELECT auth.uid()) = OLD.user_id
     AND NOT public.is_admin_or_moderator((SELECT auth.uid())) THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.challenge_id IS DISTINCT FROM OLD.challenge_id
       OR NEW.votes IS DISTINCT FROM OLD.votes
       OR NEW.boost_level IS DISTINCT FROM OLD.boost_level
       OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
       OR NEW.rewarded_at IS DISTINCT FROM OLD.rewarded_at THEN
      RAISE EXCEPTION 'Submission state is managed by the server'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.content_url IS DISTINCT FROM OLD.content_url
       OR NEW.caption IS DISTINCT FROM OLD.caption THEN
      NEW.status := 'pending';
      IF OLD.moderation_status = 'flagged' THEN
        -- Owners may correct their content, but only staff can clear a flag.
        NEW.moderation_status := OLD.moderation_status;
        NEW.moderation_flags := OLD.moderation_flags;
        NEW.moderated_at := OLD.moderated_at;
        NEW.moderated_by := OLD.moderated_by;
      ELSE
        NEW.moderation_status := 'pending_review';
        NEW.moderation_flags := NULL;
        NEW.moderated_at := NULL;
        NEW.moderated_by := NULL;
      END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
       OR NEW.moderation_flags IS DISTINCT FROM OLD.moderation_flags
       OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at THEN
      RAISE EXCEPTION 'Only staff or server functions can moderate submissions'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_submission_state ON public.submissions;
CREATE TRIGGER guard_submission_state
BEFORE INSERT OR UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_submission_state();

-- Moderate a reviewer snapshot atomically. Locking and comparing the complete
-- snapshot prevents approving content or AI evidence that changed after load.
CREATE OR REPLACE FUNCTION public.moderate_submission_batch(
  p_reviews jsonb,
  p_status text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  review jsonb;
  current_submission public.submissions%ROWTYPE;
  reviewed_count integer := 0;
BEGIN
  IF NOT public.is_admin_or_moderator((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Staff role required' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid moderation status' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_reviews) <> 'array' OR jsonb_array_length(p_reviews) = 0 THEN
    RAISE EXCEPTION 'At least one review snapshot is required' USING ERRCODE = '22023';
  END IF;

  FOR review IN SELECT value FROM jsonb_array_elements(p_reviews)
  LOOP
    SELECT * INTO current_submission
    FROM public.submissions
    WHERE id = (review->>'id')::uuid
    FOR UPDATE;

    IF NOT FOUND
       OR current_submission.status IS DISTINCT FROM 'pending'
       OR current_submission.content_url IS DISTINCT FROM review->>'content_url'
       OR coalesce(to_jsonb(current_submission.caption), 'null'::jsonb)
          IS DISTINCT FROM coalesce(review->'caption', 'null'::jsonb)
       OR coalesce(to_jsonb(current_submission.moderation_status), 'null'::jsonb)
          IS DISTINCT FROM coalesce(review->'moderation_status', 'null'::jsonb)
       OR coalesce(current_submission.moderation_flags, 'null'::jsonb)
          IS DISTINCT FROM coalesce(review->'moderation_flags', 'null'::jsonb) THEN
      RAISE EXCEPTION 'Submission changed while under review'
        USING ERRCODE = '40001';
    END IF;

    UPDATE public.submissions
    SET status = p_status,
        moderation_status = p_status,
        moderated_at = now(),
        moderated_by = (SELECT auth.uid())
    WHERE id = current_submission.id;
    reviewed_count := reviewed_count + 1;
  END LOOP;

  RETURN reviewed_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.moderate_submission_batch(jsonb, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_submission_batch(jsonb, text)
TO authenticated;

-- Enforce the active challenge window and one entry per user at the database edge.
CREATE OR REPLACE FUNCTION public.validate_submission_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  challenge_row public.challenges%ROWTYPE;
BEGIN
  SELECT * INTO challenge_row FROM public.challenges WHERE id = NEW.challenge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found' USING ERRCODE = '23503';
  END IF;
  IF challenge_row.publish_status <> 'published'
     OR now() < challenge_row.start_date
     OR now() > challenge_row.end_date THEN
    RAISE EXCEPTION 'Challenge is not accepting submissions' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_submission_window ON public.submissions;
CREATE TRIGGER validate_submission_window
BEFORE INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.validate_submission_window();

CREATE OR REPLACE FUNCTION public.reward_approved_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  points_to_award integer;
BEGIN
  -- Reward history is monotonic. Even privileged row updates cannot silently
  -- clear the marker and make a later approval look like a first approval.
  IF OLD.rewarded_at IS NOT NULL THEN
    NEW.rewarded_at := OLD.rewarded_at;
  ELSIF NEW.status = 'approved'
        AND OLD.status IS DISTINCT FROM 'approved' THEN
    SELECT points INTO points_to_award
    FROM public.challenges
    WHERE id = NEW.challenge_id;

    points_to_award := greatest(coalesce(points_to_award, 0), 0);
    UPDATE public.profiles
    SET points = points + points_to_award,
        xp = xp + points_to_award,
        level = floor((xp + points_to_award) / 1000) + 1
    WHERE id = NEW.user_id;
    NEW.rewarded_at := now();
  ELSE
    -- A privileged client must not be able to pre-mark an unrewarded row and
    -- suppress the first legitimate approval reward.
    NEW.rewarded_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_reward_approved_submission ON public.submissions;
CREATE TRIGGER zz_reward_approved_submission
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.reward_approved_submission();

REVOKE EXECUTE ON FUNCTION public.reward_approved_submission() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Challenges and storage
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view challenges" ON public.challenges;
DROP POLICY IF EXISTS "Authenticated users can create challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can update own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can delete own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Admins and moderators can update any challenge" ON public.challenges;
DROP POLICY IF EXISTS "Admins and moderators can delete any challenge" ON public.challenges;

CREATE POLICY "Published challenges are public"
ON public.challenges FOR SELECT TO anon, authenticated
USING (publish_status = 'published');

CREATE POLICY "Staff and creators can view unpublished challenges"
ON public.challenges FOR SELECT TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR public.is_admin_or_moderator((SELECT auth.uid()))
);

CREATE POLICY "Admins can create challenges"
ON public.challenges FOR INSERT TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin')
  AND created_by = (SELECT auth.uid())
);

CREATE POLICY "Staff can update challenges"
ON public.challenges FOR UPDATE TO authenticated
USING (public.is_admin_or_moderator((SELECT auth.uid())))
WITH CHECK (public.is_admin_or_moderator((SELECT auth.uid())));

CREATE POLICY "Admins can delete challenges"
ON public.challenges FOR DELETE TO authenticated
USING (public.has_role((SELECT auth.uid()), 'admin'));

UPDATE storage.buckets
SET file_size_limit = 20971520,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]::text[]
WHERE id = 'submissions';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('challenge-covers', 'challenge-covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Challenge covers are public"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'challenge-covers');

DROP POLICY IF EXISTS "Authenticated users can upload submissions" ON storage.objects;
CREATE POLICY "Users upload submissions to their folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- ---------------------------------------------------------------------------
-- Referral rewards: accept the transaction type and avoid double wallet credit
-- ---------------------------------------------------------------------------
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;
ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'boost_purchase', 'challenge_reward', 'refund', 'referral_reward',
    'subscription_payment', 'admin_adjustment'
  ));

DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;

CREATE OR REPLACE FUNCTION public.process_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_bonus integer := 50;
  referee_bonus integer := 25;
BEGIN
  IF NEW.referred_by IS NULL OR NEW.referred_by = NEW.id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.referrals (
    referrer_id, referred_id, reward_amount, status, completed_at
  ) VALUES (
    NEW.referred_by, NEW.id, referral_bonus, 'completed', now()
  ) ON CONFLICT (referrer_id, referred_id) DO NOTHING;

  IF FOUND THEN
    UPDATE public.profiles
    SET referral_count = referral_count + 1,
        referral_earnings = referral_earnings + referral_bonus,
        points = points + referral_bonus,
        xp = xp + referral_bonus,
        level = floor((xp + referral_bonus) / 1000) + 1
    WHERE id = NEW.referred_by;

    UPDATE public.profiles
    SET points = points + referee_bonus,
        xp = xp + referee_bonus,
        level = floor((xp + referee_bonus) / 1000) + 1
    WHERE id = NEW.id;

    INSERT INTO public.wallet_transactions (
      user_id, amount, transaction_type, description
    ) VALUES
      (NEW.referred_by, referral_bonus, 'referral_reward', 'Referral reward'),
      (NEW.id, referee_bonus, 'referral_reward', 'Referral welcome reward');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id uuid;
  requested_code text;
BEGIN
  requested_code := upper(nullif(trim(NEW.raw_user_meta_data->>'referral_code'), ''));
  IF requested_code IS NOT NULL THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = requested_code;
  END IF;

  INSERT INTO public.profiles (
    id, username, display_name, referred_by, referral_code
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'New User'),
    referrer_id,
    public.generate_referral_code()
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_referral() FROM PUBLIC, anon, authenticated;

-- Keep notification producers and the database constraint in sync.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'payment_success', 'subscription_activated', 'subscription_cancelled',
    'boost_applied', 'reward_earned', 'new_challenge', 'submission_approved',
    'submission_rejected', 'prize_won', 'ranking_change', 'badge_earned',
    'new_follower'
  ));

CREATE OR REPLACE FUNCTION public.guard_notification_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) = OLD.user_id AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.type IS DISTINCT FROM OLD.type OR
    NEW.title IS DISTINCT FROM OLD.title OR
    NEW.message IS DISTINCT FROM OLD.message OR
    NEW.metadata IS DISTINCT FROM OLD.metadata OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Only read state can be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_notification_update ON public.notifications;
CREATE TRIGGER guard_notification_update
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.guard_notification_update();

-- ---------------------------------------------------------------------------
-- Stripe identifiers and idempotency
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their Stripe customer link"
ON public.stripe_customers FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  livemode boolean NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.boost_purchases
  ADD COLUMN IF NOT EXISTS checkout_session_id text,
  ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.submissions(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS boost_purchases_checkout_session_id_key
ON public.boost_purchases(checkout_session_id)
WHERE checkout_session_id IS NOT NULL;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_key
ON public.subscriptions(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can insert their own boost purchases" ON public.boost_purchases;

REVOKE INSERT, UPDATE, DELETE ON public.boost_purchases FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.stripe_customers FROM anon, authenticated;
REVOKE ALL ON public.stripe_events FROM anon, authenticated;

-- Harden callable SECURITY DEFINER helpers. Role predicates remain callable by
-- authenticated users because RLS policies rely on them.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_moderator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_moderator(uuid) TO authenticated;
