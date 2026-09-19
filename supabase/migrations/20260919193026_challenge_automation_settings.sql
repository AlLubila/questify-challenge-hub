CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE public.challenge_automation_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT true,
  weekday smallint NOT NULL DEFAULT 1 CHECK (weekday BETWEEN 0 AND 6),
  hour_utc smallint NOT NULL DEFAULT 16 CHECK (hour_utc BETWEEN 0 AND 23),
  creative_brief text NOT NULL DEFAULT 'Original, safe, phone-first missions with a clear visual hook and remix potential.',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.challenge_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read challenge automation"
ON public.challenge_automation_settings FOR SELECT TO authenticated
USING (public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can update challenge automation"
ON public.challenge_automation_settings FOR UPDATE TO authenticated
USING (public.has_role((SELECT auth.uid()), 'admin'))
WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

INSERT INTO public.challenge_automation_settings (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, UPDATE ON public.challenge_automation_settings TO authenticated;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'questify-weekly-viral-challenge';

SELECT cron.schedule(
  'questify-weekly-viral-challenge',
  '0 * * * *',
  $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/generate-weekly-challenge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-automation-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'questify_automation_secret')
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
