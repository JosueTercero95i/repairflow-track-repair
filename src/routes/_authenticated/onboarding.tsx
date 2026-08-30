import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { slugify } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Configura tu taller — RepairFlow" },
      { name: "description", content: "Crea tu taller en RepairFlow y define su sucursal principal." },
      { property: "og:title", content: "Configura tu taller — RepairFlow" },
      { property: "og:description", content: "Crea tu taller y su sucursal principal en minutos." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OnboardingPage,
});

const STEPS = ["Negocio", "Sucursal", "Confirmar"];

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    legalName: "",
    slug: "",
    taxId: "",
    phone: "",
    email: "",
    branchName: "Sucursal principal",
    currency: "NIO",
  });

  const slug = form.slug || slugify(form.name);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    setLoading(true);
    const args: {
      _name: string;
      _slug: string;
      _branch_name: string;
      _currency: string;
      _legal_name?: string;
      _phone?: string;
      _email?: string;
      _tax_id?: string;
    } = {
      _name: form.name,
      _slug: slug,
      _branch_name: form.branchName,
      _currency: form.currency,
    };
    if (form.legalName) args._legal_name = form.legalName;
    if (form.phone) args._phone = form.phone;
    const email = form.email || user?.email;
    if (email) args._email = email;
    if (form.taxId) args._tax_id = form.taxId;

    const { error } = await supabase.rpc("create_tenant_with_owner", args);
    setLoading(false);

    if (error) {
      toast.error(
        error.message.includes("duplicate") || error.message.includes("unique")
          ? "Ese identificador ya está en uso. Prueba con otro."
          : error.message,
      );
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["workspace"] });
    toast.success("Taller creado. ¡Bienvenido a RepairFlow!");
    void navigate({ to: "/dashboard" });
  }

  const canContinue = step === 0 ? form.name.trim().length > 1 && slug.length > 1 : true;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-8">
        <BrandLogo />

        <ol className="flex items-center gap-2" aria-label="Progreso de configuración">
          {STEPS.map((label, index) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  index < step
                    ? "bg-success text-success-foreground"
                    : index === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {index < step ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-xs",
                  index === step ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {index < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="surface-panel space-y-5 p-6">
          {step === 0 && (
            <>
              <div className="space-y-1">
                <h1 className="font-display text-xl font-semibold">Datos del taller</h1>
                <p className="text-sm text-muted-foreground">
                  Así identificaremos tu negocio dentro de la plataforma.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre comercial *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Celutec Managua"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Identificador</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => update("slug", slugify(e.target.value))}
                  placeholder="celutec-managua"
                />
                <p className="text-xs text-muted-foreground">Debe ser único en RepairFlow.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="legalName">Razón social</Label>
                  <Input
                    id="legalName"
                    value={form.legalName}
                    onChange={(e) => update("legalName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">RUC / ID fiscal</Label>
                  <Input id="taxId" value={form.taxId} onChange={(e) => update("taxId", e.target.value)} />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-1">
                <h1 className="font-display text-xl font-semibold">Sucursal principal</h1>
                <p className="text-sm text-muted-foreground">Podrás agregar más sucursales después.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchName">Nombre de la sucursal</Label>
                <Input
                  id="branchName"
                  value={form.branchName}
                  onChange={(e) => update("branchName", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo de contacto</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder={user?.email ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Input
                  id="currency"
                  value={form.currency}
                  onChange={(e) => update("currency", e.target.value.toUpperCase().slice(0, 3))}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1">
                <h1 className="font-display text-xl font-semibold">Confirmar</h1>
                <p className="text-sm text-muted-foreground">
                  Quedarás registrado como Propietario con acceso total.
                </p>
              </div>
              <dl className="divide-y text-sm">
                {[
                  ["Taller", form.name],
                  ["Identificador", slug],
                  ["Razón social", form.legalName || "—"],
                  ["RUC / ID fiscal", form.taxId || "—"],
                  ["Sucursal", form.branchName],
                  ["Teléfono", form.phone || "—"],
                  ["Moneda", form.currency],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="truncate font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={loading}>
                Atrás
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button className="flex-1" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                Continuar
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleCreate} disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Crear taller
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
