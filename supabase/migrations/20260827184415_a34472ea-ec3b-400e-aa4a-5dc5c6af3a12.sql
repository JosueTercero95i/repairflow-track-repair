-- Trigger-only functions: nobody may call them directly
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Authorization helpers: signed-in users only (required by RLS policies)
REVOKE ALL ON FUNCTION public.is_platform_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.is_tenant_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.user_tenant_ids(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_tenant_ids(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.has_permission(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.shares_tenant_with(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_tenant_with(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.create_tenant_with_owner(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_tenant_with_owner(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;