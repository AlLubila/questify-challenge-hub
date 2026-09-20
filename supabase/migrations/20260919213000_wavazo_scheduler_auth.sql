SELECT vault.create_secret('https://wfaeptwxocikjumzwddu.supabase.co', 'project_url')
WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'project_url');

SELECT vault.create_secret('sb_publishable_NrBMNxPzih1Rqt0xXla-yQ_yx_7x0S5', 'publishable_key')
WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'publishable_key');

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('questify-weekly-viral-challenge', 'wavazo-weekly-creator-challenge');

SELECT cron.schedule(
  'wavazo-weekly-creator-challenge',
  '0 * * * *',
  $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/generate-weekly-challenge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publishable_key'),
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publishable_key')
    ),
    body := jsonb_build_object('scheduled_at', now())
  )
  FROM public.challenge_automation_settings
  WHERE id = true
    AND enabled
    AND weekday = EXTRACT(DOW FROM now())::smallint
    AND hour_utc = EXTRACT(HOUR FROM now())::smallint
    AND NOT EXISTS (
      SELECT 1 FROM public.challenges
      WHERE challenge_type = 'weekly'
        AND is_ai_generated
        AND created_at >= date_trunc('week', now())
    );
  $job$
);
