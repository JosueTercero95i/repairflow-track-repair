CREATE TYPE public.repair_status AS ENUM ('RECEPCION','DIAGNOSTICO','COTIZACION','APROBACION','REPARACION','PRUEBAS','READY');
CREATE TYPE public.repair_priority AS ENUM ('NORMAL','ALTA','URGENTE');

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  document_id text,
  address text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_tenant_idx ON public.customers(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated WITH CHECK (has_permission(tenant_id, 'customers.create'));
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated USING (has_permission(tenant_id, 'customers.update')) WITH CHECK (has_permission(tenant_id, 'customers.update'));
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated USING (has_permission(tenant_id, 'customers.delete'));
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  brand text NOT NULL,
  model text NOT NULL,
  imei text,
  serial_number text,
  color text,
  unlock_code text,
  accessories text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX devices_tenant_idx ON public.devices(tenant_id);
CREATE INDEX devices_customer_idx ON public.devices(customer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY devices_select ON public.devices FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY devices_insert ON public.devices FOR INSERT TO authenticated WITH CHECK (has_permission(tenant_id, 'devices.create'));
CREATE POLICY devices_update ON public.devices FOR UPDATE TO authenticated USING (has_permission(tenant_id, 'devices.update')) WITH CHECK (has_permission(tenant_id, 'devices.update'));
CREATE POLICY devices_delete ON public.devices FOR DELETE TO authenticated USING (has_permission(tenant_id, 'devices.delete'));
CREATE TRIGGER devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.repair_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
  folio integer NOT NULL,
  public_code text NOT NULL UNIQUE,
  status public.repair_status NOT NULL DEFAULT 'RECEPCION',
  priority public.repair_priority NOT NULL DEFAULT 'NORMAL',
  reported_issue text NOT NULL,
  diagnosis text,
  work_notes text,
  quoted_amount numeric(12,2),
  approved_at timestamptz,
  assigned_to uuid,
  promised_at timestamptz,
  ready_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, folio)
);
CREATE INDEX repair_orders_tenant_status_idx ON public.repair_orders(tenant_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_orders TO authenticated;
GRANT ALL ON public.repair_orders TO service_role;
ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY repair_orders_select ON public.repair_orders FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY repair_orders_insert ON public.repair_orders FOR INSERT TO authenticated WITH CHECK (has_permission(tenant_id, 'repairs.create'));
CREATE POLICY repair_orders_update ON public.repair_orders FOR UPDATE TO authenticated USING (has_permission(tenant_id, 'repairs.update') OR has_permission(tenant_id, 'repairs.change_status')) WITH CHECK (has_permission(tenant_id, 'repairs.update') OR has_permission(tenant_id, 'repairs.change_status'));
CREATE POLICY repair_orders_delete ON public.repair_orders FOR DELETE TO authenticated USING (has_permission(tenant_id, 'repairs.delete'));
CREATE TRIGGER repair_orders_updated_at BEFORE UPDATE ON public.repair_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.repair_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  repair_order_id uuid NOT NULL REFERENCES public.repair_orders(id) ON DELETE CASCADE,
  from_status public.repair_status,
  to_status public.repair_status NOT NULL,
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX repair_status_history_order_idx ON public.repair_status_history(repair_order_id);
GRANT SELECT ON public.repair_status_history TO authenticated;
GRANT ALL ON public.repair_status_history TO service_role;
ALTER TABLE public.repair_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY repair_history_select ON public.repair_status_history FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));

CREATE OR REPLACE FUNCTION public.repair_orders_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _next integer;
BEGIN
  SELECT coalesce(max(folio), 0) + 1 INTO _next FROM public.repair_orders WHERE tenant_id = NEW.tenant_id;
  NEW.folio := _next;
  IF NEW.public_code IS NULL OR NEW.public_code = '' THEN
    NEW.public_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  END IF;
  NEW.created_by := coalesce(NEW.created_by, auth.uid());
  RETURN NEW;
END; $$;
CREATE TRIGGER repair_orders_before_insert BEFORE INSERT ON public.repair_orders FOR EACH ROW EXECUTE FUNCTION public.repair_orders_before_insert();

CREATE OR REPLACE FUNCTION public.repair_orders_log_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.repair_status_history (tenant_id, repair_order_id, from_status, to_status, changed_by)
    VALUES (NEW.tenant_id, NEW.id, NULL, NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.repair_status_history (tenant_id, repair_order_id, from_status, to_status, changed_by)
    VALUES (NEW.tenant_id, NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER repair_orders_log_status AFTER INSERT OR UPDATE OF status ON public.repair_orders FOR EACH ROW EXECUTE FUNCTION public.repair_orders_log_status();