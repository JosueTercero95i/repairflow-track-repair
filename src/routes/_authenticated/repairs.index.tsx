import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell, EmptyState } from "@/components/app-shell";
import { WorkspaceGate } from "@/components/workspace-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Membership } from "@/lib/tenant";
import {
  PRIORITY_LABEL,
  REPAIR_FLOW,
  STATUS_CLASS,
  STATUS_LABEL,
  useCreateRepairOrder,
  useRepairOrders,
  type RepairPriority,
  type RepairStatus,
} from "@/lib/repairs";

export const Route = createFileRoute("/_authenticated/repairs/")({
  head: () => ({
    meta: [
      { title: "Reparaciones — RepairFlow" },
      {
        name: "description",
        content: "Flujo de reparación por estados: recepción, diagnóstico, cotización, aprobación, reparación, pruebas y entrega.",
      },
      { property: "og:title", content: "Reparaciones — RepairFlow" },
      { property: "og:description", content: "Controla cada orden de servicio de tu taller por estado y responsable." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: RepairsPage,
});

function RepairsPage() {
  return (
    <WorkspaceGate>
      {({ membership, permissions }) => (
        <AppShell
          membership={membership}
          permissions={permissions}
          title="Reparaciones"
          description="Órdenes de servicio y su avance por estado"
        >
          <RepairsBody membership={membership} permissions={permissions} />
        </AppShell>
      )}
    </WorkspaceGate>
  );
}

function RepairsBody({ membership, permissions }: { membership: Membership; permissions: string[] }) {
  const tenantId = membership.tenant_id;
  const { data, isLoading } = useRepairOrders(tenantId);
  const [filter, setFilter] = useState<RepairStatus | "TODAS">("TODAS");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const canCreate = permissions.includes("repairs.create") && permissions.includes("customers.create");

  const counts = useMemo(() => {
    const base: Record<string, number> = { TODAS: data?.length ?? 0 };
    for (const s of REPAIR_FLOW) base[s] = 0;
    for (const o of data ?? []) base[o.status] = (base[o.status] ?? 0) + 1;
    return base;
  }, [data]);

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (data ?? []).filter((o) => {
      if (filter !== "TODAS" && o.status !== filter) return false;
      if (!q) return true;
      return [
        String(o.folio),
        o.public_code,
        o.customer?.full_name ?? "",
        o.device?.brand ?? "",
        o.device?.model ?? "",
        o.device?.imei ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, filter, term]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por folio, cliente, equipo o IMEI"
            className="pl-9"
          />
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nueva orden
          </Button>
        )}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(["TODAS", ...REPAIR_FLOW] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s as RepairStatus | "TODAS")}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
              filter === s ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
            )}
          >
            {s === "TODAS" ? "Todas" : STATUS_LABEL[s as RepairStatus]}
            <span className="text-[10px] text-muted-foreground">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin órdenes en esta vista"
          description="Registra una orden al recibir un equipo: se generará su folio y código público de seguimiento."
          {...(canCreate ? { action: <Button onClick={() => setOpen(true)}>Nueva orden</Button> } : {})}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((o) => (
            <Link
              key={o.id}
              to="/repairs/$orderId"
              params={{ orderId: o.id }}
              className="surface-panel block space-y-3 p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold">OS-{String(o.folio).padStart(4, "0")}</p>
                  <p className="truncate text-xs text-muted-foreground">{o.customer?.full_name ?? "Sin cliente"}</p>
                </div>
                <Badge variant="secondary" className={cn("border-0 shrink-0", STATUS_CLASS[o.status])}>
                  {STATUS_LABEL[o.status]}
                </Badge>
              </div>
              <p className="truncate text-sm">
                {o.device ? `${o.device.brand} ${o.device.model}` : "Equipo sin datos"}
              </p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{o.reported_issue}</p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-mono">{o.public_code}</span>
                <span>{PRIORITY_LABEL[o.priority]}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <NewOrderDialog
        open={open}
        onOpenChange={setOpen}
        tenantId={tenantId}
        branchId={membership.branch_id}
      />
    </div>
  );
}

function NewOrderDialog({
  open,
  onOpenChange,
  tenantId,
  branchId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  branchId: string | null;
}) {
  const create = useCreateRepairOrder();
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    brand: "",
    model: "",
    imei: "",
    unlockCode: "",
    reportedIssue: "",
    priority: "NORMAL" as RepairPriority,
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const order = await create.mutateAsync({ tenantId, branchId, ...form });
      toast.success(`Orden OS-${String(order.folio).padStart(4, "0")} creada`);
      onOpenChange(false);
      setForm({
        customerName: "",
        customerPhone: "",
        brand: "",
        model: "",
        imei: "",
        unlockCode: "",
        reportedIssue: "",
        priority: "NORMAL",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos crear la orden");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva orden de servicio</DialogTitle>
          <DialogDescription>Registra el cliente, el equipo y la falla reportada.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customerName">Cliente</Label>
              <Input
                id="customerName"
                required
                value={form.customerName}
                onChange={(e) => set("customerName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerPhone">Teléfono</Label>
              <Input
                id="customerPhone"
                value={form.customerPhone}
                onChange={(e) => set("customerPhone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" required value={form.brand} onChange={(e) => set("brand", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" required value={form.model} onChange={(e) => set("model", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imei">IMEI / Serie</Label>
              <Input id="imei" value={form.imei} onChange={(e) => set("imei", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unlockCode">Código de desbloqueo</Label>
              <Input id="unlockCode" value={form.unlockCode} onChange={(e) => set("unlockCode", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reportedIssue">Falla reportada</Label>
            <Textarea
              id="reportedIssue"
              required
              rows={3}
              value={form.reportedIssue}
              onChange={(e) => set("reportedIssue", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Prioridad</Label>
            <div className="flex gap-2">
              {(["NORMAL", "ALTA", "URGENTE"] as RepairPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set("priority", p)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    form.priority === p ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="size-4 animate-spin" />}
              Crear orden
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
