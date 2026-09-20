begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

select has_table('public', 'stripe_events', 'Stripe event idempotency table exists');
select has_table('public', 'stripe_customers', 'Stripe customer mapping table exists');
select has_column('public', 'submissions', 'rewarded_at', 'Submission rewards are tracked idempotently');
select has_column('public', 'boost_purchases', 'checkout_session_id', 'Boost checkout sessions are recorded');

select ok(
  not has_function_privilege('anon', 'public.increment_points(uuid,integer)', 'EXECUTE'),
  'Anonymous users cannot execute increment_points'
);
select ok(
  not has_function_privilege('authenticated', 'public.increment_points(uuid,integer)', 'EXECUTE'),
  'Authenticated users cannot execute increment_points'
);
select ok(
  not has_function_privilege('authenticated', 'public.process_referral()', 'EXECUTE'),
  'Referral processing is trigger-only'
);

select policies_are(
  'public', 'boost_purchases',
  array['Users can view their own boost purchases'],
  'Boost purchases expose no client insert policy'
);
select policies_are(
  'public', 'stripe_events',
  array[]::text[],
  'Stripe events have no client policies'
);

select ok(
  exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can view their own full profile'),
  'Profiles have an owner read policy'
);
select ok(
  exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Staff can view profiles'),
  'Staff can read profiles'
);
select ok(
  exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'submissions' and policyname = 'Owners can edit submission content'),
  'Submission owners have a guarded edit policy'
);
select ok(
  exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'challenges' and policyname = 'Admins can create challenges'),
  'Challenge creation is admin-only'
);
select ok(
  exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'challenges' and policyname = 'Published challenges are public'),
  'Only published challenges are public'
);

select trigger_is(
  'public', 'profiles', 'protect_profile_managed_fields',
  'public', 'protect_profile_managed_fields',
  'Managed profile fields are protected by a trigger'
);
select trigger_is(
  'public', 'submissions', 'guard_submission_state',
  'public', 'guard_submission_state',
  'Submission moderation state is protected by a trigger'
);

select trigger_is(
  'public', 'user_roles', 'prevent_admin_self_demotion',
  'public', 'prevent_admin_self_demotion',
  'Administrators cannot accidentally delete their own admin role'
);

select ok(
  position('old.user_id = (select auth.uid())' in lower(pg_get_functiondef('public.prevent_admin_self_demotion()'::regprocedure))) > 0
  and position('old.role = ''admin''::public.app_role' in lower(pg_get_functiondef('public.prevent_admin_self_demotion()'::regprocedure))) > 0,
  'The self-demotion guard is narrowly scoped to the caller admin role'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_roles'
      and policyname = 'Only admins can delete roles'
      and lower(qual) like '%not%'
      and lower(qual) like '%user_id%auth.uid%'
      and lower(qual) like '%role%admin%'
  ),
  'Role deletion policy blocks an administrator from targeting their own admin row'
);

select ok(
  position('new.rewarded_at is distinct from old.rewarded_at' in lower(pg_get_functiondef('public.guard_submission_state()'::regprocedure))) > 0,
  'Submission owners cannot change the reward idempotency marker'
);

select ok(
  position('old.moderation_status = ''flagged''' in lower(pg_get_functiondef('public.guard_submission_state()'::regprocedure))) > 0,
  'Owner edits preserve flagged moderation evidence for staff review'
);

select ok(
  position('new.rewarded_at := null' in lower(pg_get_functiondef('public.reward_approved_submission()'::regprocedure))) > 0,
  'Non-approval updates cannot pre-mark a submission as rewarded'
);

select ok(
  position('for update' in lower(pg_get_functiondef('public.moderate_submission_batch(jsonb,text)'::regprocedure))) > 0
  and position('moderation_flags' in lower(pg_get_functiondef('public.moderate_submission_batch(jsonb,text)'::regprocedure))) > 0,
  'Batch moderation locks and compares the complete review snapshot'
);

select * from finish();
rollback;
