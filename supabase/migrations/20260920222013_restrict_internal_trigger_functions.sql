-- These functions are invoked by database triggers only. PostgreSQL does not
-- require API roles to have EXECUTE privileges for trigger execution, so keep
-- them out of the public RPC surface.
REVOKE EXECUTE ON FUNCTION public.handle_updated_at()
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_follow_counts()
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_push_tokens_updated_at()
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_submission_votes()
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_wallet_balance()
FROM PUBLIC, anon, authenticated;
