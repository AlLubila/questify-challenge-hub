CREATE OR REPLACE FUNCTION public.prevent_admin_self_demotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.role = 'admin'::public.app_role
     AND OLD.user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'You cannot remove your own administrator role'
      USING ERRCODE = '42501';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_admin_self_demotion ON public.user_roles;
CREATE TRIGGER prevent_admin_self_demotion
BEFORE DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_self_demotion();

REVOKE EXECUTE ON FUNCTION public.prevent_admin_self_demotion()
FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  AND NOT (
    user_id = (SELECT auth.uid())
    AND role = 'admin'::public.app_role
  )
);
