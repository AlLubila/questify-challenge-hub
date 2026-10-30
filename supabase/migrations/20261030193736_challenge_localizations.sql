-- Editorial translations share the existing challenge permissions and publication rules.
ALTER TABLE public.challenges
  ADD COLUMN source_language text NOT NULL DEFAULT 'en'
    CHECK (source_language IN ('en', 'fr', 'pl', 'de', 'es')),
  ADD COLUMN translations jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(translations) = 'object');

COMMENT ON COLUMN public.challenges.translations IS
  'Language code -> {title, description, prize?, image_url?}. Covers without text may be shared across languages.';
