import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { WorkspaceGate } from "@/components/workspace-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Membership } from "@/lib/tenant";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Configuración — RepairFlow" },
      { name: "description", content: "Administra los datos generales de tu taller en RepairFlow." },
      { property: "og:title", content: "Configuración — RepairFlow" },
      { property: "og:description", content: "Datos generales, contacto y moneda de tu taller." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <WorkspaceGate>
      {({ membership, permissions }) => (
        <AppShell
          membership={membership}
          permissions={permissions}
          title="Configuración"
          description="Datos generales del taller"
          actions={<StatusBadge status={membership.tenant.status} />}
        >
          <TenantForm membership={membership} canEdit={permissions.includes("settings.manage")} />
        </AppShell>
      )}
    </WorkspaceGate>
  );
}

function TenantForm({ membership, canEdit }: { membership: Membership; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: membership.tenant.name,
    legal_name: membership.tenant.legal_name ?? "",
    tax_id: membership.tenant.tax_id ?? "",
    phone: membership.tenant.phone ?? "",
    email: membership.tenant.email ?? "",
    website: membership.tenant.website ?? "",
    currency: membership.tenant.currency,
  });

  useEffect(() => {
    setForm({
      name: membership.tenant.name,
      legal_name: membership.tenant.legal_name ?? "",
      tax_id: membership.tenant.tax_id ?? "",
      phone: membership.tenant.phone ?? "",
      email: membership.tenant.email ?? "",
      website: membership.tenant.website ?? "",
      currency: membership.tenant.currency,
    });
  }, [membership.tenant]);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        name: form.name,
        legal_name: form.legal_name || null,
        tax_id: form.tax_id || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        currency: form.currency,
      })
      .eq("id", membership.tenant_id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["workspace"] });
    toast.success("Cambios guardados");
  }

  const fields: Array<[keyof typeof form, string, string?]> = [
    ["name", "Nombre comercial"],
    ["legal_name", "Razón social"],
    ["tax_id", "RUC / ID fiscal"],
    ["phone", "Teléfono"],
    ["email", "Correo", "email"],
    ["website", "Sitio web"],
    ["currency", "Moneda"],
  ];

  return (
    <div className="surface-panel max-w-2xl space-y-5 p-6">
      <div className="space-y-1">
        <h2 className="font-display text-base font-semibold">Datos del taller</h2>
        <p className="text-sm text-muted-foreground">
          Identificador: <span className="font-mono">{membership.tenant.slug}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([field, label, type]) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={field}>{label}</Label>
            <Input
              id={field}
              type={type ?? "text"}
              value={form[field]}
              disabled={!canEdit}
              onChange={(e) => update(field, e.target.value)}
            />
          </div>
        ))}
      </div>

      {canEdit ? (
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Guardar cambios
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tu rol no permite editar la configuración del taller.
        </p>
      )}
    </div>
  );
}
