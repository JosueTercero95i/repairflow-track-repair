-- ============================================================
-- RepairFlow SaaS — Fase 2: Multi-tenancy foundation
-- ============================================================

-- ---------- ENUMS ----------
CREATE TYPE public.tenant_status AS ENUM ('ACTIVE','TRIAL','SUSPENDED','CANCELLED');
CREATE TYPE public.membership_status AS ENUM ('ACTIVE','INVITED','SUSPENDED');
CREATE TYPE public.app_role AS ENUM ('OWNER','ADMIN','RECEPTION','TECHNICIAN','INVENTORY','ACCOUNTING','VIEWER');

-- ---------- shared updated_at ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- PROFILES ----------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- PLATFORM ADMINS (super admin, NOT tenant-scoped) ----------
CREATE TABLE public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = _user_id);
$$;

CREATE POLICY "platform_admins_self_read" ON public.platform_admins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ---------- TENANTS ----------
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  slug TEXT NOT NULL UNIQUE,
  tax_id TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  status public.tenant_status NOT NULL DEFAULT 'TRIAL',
  timezone TEXT NOT NULL DEFAULT 'America/Managua',
  currency TEXT NOT NULL DEFAULT 'NIO',
  locale TEXT NOT NULL DEFAULT 'es',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- ROLES ----------
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code public.app_role NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_read_authenticated" ON public.roles FOR SELECT TO authenticated USING (true);

-- ---------- PERMISSIONS ----------
CREATE TABLE public.permissions (
  code TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  description TEXT NOT NULL
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions_read_authenticated" ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_read_authenticated" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- ---------- BRANCHES ----------
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Nicaragua',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX branches_tenant_idx ON public.branches(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- MEMBERSHIPS ----------
CREATE TABLE public.tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id),
  status public.membership_status NOT NULL DEFAULT 'ACTIVE',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX tenant_memberships_user_idx ON public.tenant_memberships(user_id);
CREATE INDEX tenant_memberships_tenant_idx ON public.tenant_memberships(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_memberships TO authenticated;
GRANT ALL ON public.tenant_memberships TO service_role;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tenant_memberships_updated_at BEFORE UPDATE ON public.tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- AUTHZ HELPERS (SECURITY DEFINER, avoid RLS recursion) ----------
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = _tenant_id AND m.user_id = _user_id AND m.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_tenant_ids(_user_id UUID DEFAULT auth.uid())
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.tenant_id FROM public.tenant_memberships m
  WHERE m.user_id = _user_id AND m.status = 'ACTIVE';
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_tenant_id UUID, _permission TEXT, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships m
    JOIN public.role_permissions rp ON rp.role_id = m.role_id
    WHERE m.tenant_id = _tenant_id
      AND m.user_id = _user_id
      AND m.status = 'ACTIVE'
      AND rp.permission_code = _permission
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_tenant_with(_other_user UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships a
    JOIN public.tenant_memberships b ON b.tenant_id = a.tenant_id
    WHERE a.user_id = _user_id AND b.user_id = _other_user AND a.status = 'ACTIVE'
  );
$$;

-- ---------- POLICIES ----------
-- profiles
CREATE POLICY "profiles_select_self_or_coworker" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_tenant_with(id) OR public.is_platform_admin());
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- tenants
CREATE POLICY "tenants_select_members" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(id) OR public.is_platform_admin());
CREATE POLICY "tenants_insert_owner" ON public.tenants
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "tenants_update_settings" ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.has_permission(id, 'settings.manage') OR public.is_platform_admin())
  WITH CHECK (public.has_permission(id, 'settings.manage') OR public.is_platform_admin());

-- branches
CREATE POLICY "branches_select_members" ON public.branches
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id) OR public.is_platform_admin());
CREATE POLICY "branches_insert" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(tenant_id, 'settings.manage'));
CREATE POLICY "branches_update" ON public.branches
  FOR UPDATE TO authenticated
  USING (public.has_permission(tenant_id, 'settings.manage'))
  WITH CHECK (public.has_permission(tenant_id, 'settings.manage'));
CREATE POLICY "branches_delete" ON public.branches
  FOR DELETE TO authenticated
  USING (public.has_permission(tenant_id, 'settings.manage'));

-- memberships
CREATE POLICY "memberships_select_own_tenants" ON public.tenant_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_tenant_member(tenant_id) OR public.is_platform_admin());
CREATE POLICY "memberships_insert_manage" ON public.tenant_memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(tenant_id, 'users.manage'));
CREATE POLICY "memberships_update_manage" ON public.tenant_memberships
  FOR UPDATE TO authenticated
  USING (public.has_permission(tenant_id, 'users.manage'))
  WITH CHECK (public.has_permission(tenant_id, 'users.manage'));
CREATE POLICY "memberships_delete_manage" ON public.tenant_memberships
  FOR DELETE TO authenticated
  USING (public.has_permission(tenant_id, 'users.manage'));

-- ---------- AUDIT LOGS ----------
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_tenant_idx ON public.audit_logs(tenant_id, created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_select_permitted" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (tenant_id IS NOT NULL AND (public.has_permission(tenant_id, 'settings.view') OR public.is_platform_admin()));

-- ---------- ONBOARDING RPC (atomic tenant creation) ----------
CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
  _name TEXT,
  _slug TEXT,
  _legal_name TEXT DEFAULT NULL,
  _phone TEXT DEFAULT NULL,
  _email TEXT DEFAULT NULL,
  _tax_id TEXT DEFAULT NULL,
  _branch_name TEXT DEFAULT 'Sucursal principal',
  _timezone TEXT DEFAULT 'America/Managua',
  _currency TEXT DEFAULT 'NIO'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _tenant_id UUID;
  _branch_id UUID;
  _owner_role UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF coalesce(trim(_name),'') = '' THEN RAISE EXCEPTION 'El nombre del taller es obligatorio'; END IF;
  IF coalesce(trim(_slug),'') = '' THEN RAISE EXCEPTION 'El identificador del taller es obligatorio'; END IF;

  SELECT id INTO _owner_role FROM public.roles WHERE code = 'OWNER';

  INSERT INTO public.tenants (name, legal_name, slug, tax_id, phone, email, status, timezone, currency, created_by)
  VALUES (trim(_name), _legal_name, lower(trim(_slug)), _tax_id, _phone, _email, 'TRIAL', _timezone, _currency, _uid)
  RETURNING id INTO _tenant_id;

  INSERT INTO public.branches (tenant_id, name, code, phone, email)
  VALUES (_tenant_id, coalesce(nullif(trim(_branch_name),''),'Sucursal principal'), 'MAIN', _phone, _email)
  RETURNING id INTO _branch_id;

  INSERT INTO public.tenant_memberships (tenant_id, user_id, branch_id, role_id, status)
  VALUES (_tenant_id, _uid, _branch_id, _owner_role, 'ACTIVE');

  INSERT INTO public.audit_logs (tenant_id, user_id, action, entity_type, entity_id, new_values)
  VALUES (_tenant_id, _uid, 'CREATE', 'tenant', _tenant_id, jsonb_build_object('name', _name, 'slug', _slug));

  RETURN _tenant_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_tenant_with_owner(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;

-- ---------- new user -> profile ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', split_part(coalesce(NEW.email,''), '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- SEED: roles ----------
INSERT INTO public.roles (code, name, description, sort_order) VALUES
  ('OWNER','Propietario','Control total del taller, incluida facturación',1),
  ('ADMIN','Administrador','Gestiona operación, equipo y configuración',2),
  ('RECEPTION','Recepción','Recibe equipos, atiende clientes y cobra',3),
  ('TECHNICIAN','Técnico','Diagnostica y repara equipos asignados',4),
  ('INVENTORY','Inventario','Administra repuestos, stock y proveedores',5),
  ('ACCOUNTING','Contabilidad','Pagos, facturas y reportes financieros',6),
  ('VIEWER','Consulta','Acceso de sólo lectura',7);

-- ---------- SEED: permissions ----------
INSERT INTO public.permissions (code, module, description) VALUES
  ('dashboard.view','dashboard','Ver el panel principal'),
  ('customers.view','customers','Ver clientes'),
  ('customers.create','customers','Crear clientes'),
  ('customers.update','customers','Editar clientes'),
  ('customers.delete','customers','Eliminar clientes'),
  ('devices.view','devices','Ver dispositivos'),
  ('devices.create','devices','Crear dispositivos'),
  ('devices.update','devices','Editar dispositivos'),
  ('devices.delete','devices','Eliminar dispositivos'),
  ('repairs.view','repairs','Ver reparaciones'),
  ('repairs.create','repairs','Crear reparaciones'),
  ('repairs.update','repairs','Editar reparaciones'),
  ('repairs.delete','repairs','Anular reparaciones'),
  ('repairs.assign','repairs','Asignar técnico'),
  ('repairs.change_status','repairs','Cambiar estado de reparación'),
  ('diagnostics.view','diagnostics','Ver diagnósticos'),
  ('diagnostics.create','diagnostics','Crear diagnósticos'),
  ('diagnostics.update','diagnostics','Editar diagnósticos'),
  ('quotes.view','quotes','Ver cotizaciones'),
  ('quotes.create','quotes','Crear cotizaciones'),
  ('quotes.update','quotes','Editar cotizaciones'),
  ('quotes.approve','quotes','Aprobar cotizaciones'),
  ('inventory.view','inventory','Ver inventario'),
  ('inventory.create','inventory','Crear repuestos'),
  ('inventory.update','inventory','Editar repuestos'),
  ('inventory.adjust','inventory','Ajustar existencias'),
  ('payments.view','payments','Ver pagos'),
  ('payments.create','payments','Registrar pagos'),
  ('invoices.view','invoices','Ver facturas'),
  ('invoices.create','invoices','Crear facturas'),
  ('reports.view','reports','Ver reportes'),
  ('users.view','users','Ver el equipo'),
  ('users.manage','users','Administrar el equipo y sus roles'),
  ('settings.view','settings','Ver configuración'),
  ('settings.manage','settings','Modificar configuración');

-- ---------- SEED: role_permissions ----------
-- OWNER y ADMIN: todo
INSERT INTO public.role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM public.roles r CROSS JOIN public.permissions p
WHERE r.code IN ('OWNER','ADMIN');

-- RECEPTION
INSERT INTO public.role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM public.roles r JOIN public.permissions p ON p.code IN (
  'dashboard.view','customers.view','customers.create','customers.update',
  'devices.view','devices.create','devices.update',
  'repairs.view','repairs.create','repairs.update','repairs.change_status',
  'diagnostics.view','quotes.view','quotes.create',
  'payments.view','payments.create','invoices.view','invoices.create','inventory.view'
) WHERE r.code = 'RECEPTION';

-- TECHNICIAN
INSERT INTO public.role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM public.roles r JOIN public.permissions p ON p.code IN (
  'dashboard.view','customers.view','devices.view',
  'repairs.view','repairs.update','repairs.change_status',
  'diagnostics.view','diagnostics.create','diagnostics.update',
  'quotes.view','quotes.create','inventory.view'
) WHERE r.code = 'TECHNICIAN';

-- INVENTORY
INSERT INTO public.role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM public.roles r JOIN public.permissions p ON p.code IN (
  'dashboard.view','repairs.view','inventory.view','inventory.create',
  'inventory.update','inventory.adjust','reports.view'
) WHERE r.code = 'INVENTORY';

-- ACCOUNTING
INSERT INTO public.role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM public.roles r JOIN public.permissions p ON p.code IN (
  'dashboard.view','customers.view','repairs.view','quotes.view',
  'payments.view','payments.create','invoices.view','invoices.create','reports.view'
) WHERE r.code = 'ACCOUNTING';

-- VIEWER
INSERT INTO public.role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM public.roles r JOIN public.permissions p ON p.code IN (
  'dashboard.view','customers.view','devices.view','repairs.view',
  'diagnostics.view','quotes.view','inventory.view','reports.view'
) WHERE r.code = 'VIEWER';