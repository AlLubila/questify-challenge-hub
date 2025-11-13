-- Fix search_path for update_push_tokens_updated_at function
DROP TRIGGER IF EXISTS push_tokens_updated_at ON public.push_tokens;
DROP FUNCTION IF EXISTS update_push_tokens_updated_at();

CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();