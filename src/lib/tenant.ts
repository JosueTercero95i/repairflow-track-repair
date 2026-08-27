import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRoleCode =
  | "OWNER"
  | "ADMIN"
  | "RECEPTION"
  | "TECHNICIAN"
  | "INVENTORY"
  | "ACCOUNTING"
  | "VIEWER";

export type TenantSummary = {
  id: string;
  name: string;
  legal_name: string | null;
  slug: string;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  status: "ACTIVE" | "TRIAL" | "SUSPENDED" | "CANCELLED";
  timezone: string;
  currency: string;
};

export type Membership = {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  role: { code: AppRoleCode; name: string };
  tenant: TenantSummary;
};

export type Workspace = {
  membership: Membership | null;
  permissions: string[];
};

const MEMBERSHIP_SELECT = `
  id, tenant_id, branch_id, status, role_id,
  role:roles!inner ( code, name ),
  tenant:tenants!inner (
    id, name, legal_name, slug, tax_id, phone, email, website, logo_url, status, timezone, currency
  )
`;

export async function fetchWorkspace(userId: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from("tenant_memberships")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { membership: null, permissions: [] };

  const { data: perms, error: permError } = await supabase
    .from("role_permissions")
    .select("permission_code")
    .eq("role_id", (data as { role_id: string }).role_id);

  if (permError) throw permError;

  return {
    membership: data as unknown as Membership,
    permissions: (perms ?? []).map((p) => p.permission_code as string),
  };
}

export function useWorkspace(userId: string | undefined) {
  return useQuery({
    queryKey: ["workspace", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchWorkspace(userId as string),
    staleTime: 60_000,
  });
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function can(permissions: string[], permission: string) {
  return permissions.includes(permission);
}
