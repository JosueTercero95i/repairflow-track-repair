import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, History, Loader2, Lock, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { WorkspaceGate } from "@/components/workspace-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Membership } from "@/lib/tenant";
import {
  PRIORITY_LABEL,
  REPAIR_FLOW,
  STATUS_CLASS,
  STATUS_HINT,
  STATUS_LABEL,
  canMoveTo,
  nextStatus,
  prevStatus,
  useRepairOrder,
  useUpdateRepairOrder,
  type RepairStatus,
} from "@/lib/repairs";

export const Route = createFileRoute("/_authenticated/repairs/$orderId")({
  head: () => ({
    meta: [
      { title: "Orden de reparación — RepairFlow" },
      { name: "description", content: "Detalle de la orden: diagnóstico, cotización, avance de estado e historial." },
      { property: "og:title", content: "Orden de reparación — RepairFlow" },
      { property: "og:description", content: "Gestiona el avance de la orden según tu rol en el taller." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: RepairDetailPage,
});

function RepairDetailPage() {
  const { orderId } = useParams({ from: "/_authenticated/repairs/$orderId" });
  return (
    <WorkspaceGate>
      {({ membership, permissions }) => (
        <AppShell
          membership={membership}
          permissions={permissions}
          title="Orden de reparación"
          description={membership.tenant.name}
        >
          <DetailBody membership={membership} permissions={permissions} orderId={orderId} />
        </AppShell>
      )}
    </WorkspaceGate>
  );
}

function DetailBody({
  membership,
  permissions,
  orderId,
}: {
  membership: Membership;
  permissions: string[];
  orderId: string;
}) {
  const { data, isLoading, error } = useRepairOrder(membership.tenant_id, orderId);
  const update = useUpdateRepairOrder(orderId);
  const [note, setNote] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [quote, setQuote] = useState("");
  const [workNotes, setWorkNotes] = useState("");

  const order = data?.order;

  useEffect(() => {
    if (!order) return;
    setDiagnosis(order.diagnosis ?? "");
    setQuote(order.quoted_amount != null ? String(order.quoted_amount) : "");
    setWorkNotes(order.work_notes ?? "");
  }, [order?.id, order?.diagnosis, order?.quoted_amount, order?.work_notes]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="surface-panel space-y-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">No encontramos esta orden.</p>
        <Button asChild variant="outline">
          <Link to="/repairs">Volver a reparaciones</Link>
        </Button>
      </div>
    );
  }

  const forward = nextStatus(order.status);
  const back = prevStatus(order.status);
  const canForward = forward ? canMoveTo(permissions, forward) : false;
  const canBack = permissions.includes("repairs.change_status");
  const canEdit = permissions.includes("repairs.update");

  async function move(to: RepairStatus) {
    try {
      await update.mutateAsync({
        status: to,
        ...(to === "APROBACION" ? {} : {}),
        ...(to === "REPARACION" ? { approved_at: new Date().toISOString() } : {}),
        ...(to === "READY" ? { ready_at: new Date().toISOString() } : {}),
      });
      if (note.trim()) {
        setNote("");
      }
      toast.success(`Estado actualizado a ${STATUS_LABEL[to]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos cambiar el estado");
    }
  }

  async function saveField(patch: Record<string, string | number | null>) {
    try {
      await update.mutateAsync(patch);
      toast.success("Cambios guardados");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos guardar");
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/repairs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Reparaciones
      </Link>

      <div className="surface-panel space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">OS-{String(order.folio).padStart(4, "0")}</h2>
            <p className="text-sm text-muted-foreground">
              {order.customer?.full_name ?? "Sin cliente"}
              {order.customer?.phone ? ` · ${order.customer.phone}` : ""}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">Seguimiento: {order.public_code}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="border-0">{PRIORITY_LABEL[order.priority]}</Badge>
            <Badge variant="secondary" className={cn("border-0", STATUS_CLASS[order.status])}>
              {STATUS_LABEL[order.status]}
            </Badge>
          </div>
        </div>

        <Stepper current={order.status} />
        <p className="text-sm text-muted-foreground">{STATUS_HINT[order.status]}</p>

        <div className="flex flex-wrap gap-2">
          {back && (
            <Button variant="outline" disabled={!canBack || update.isPending} onClick={() => move(back)}>
              <Undo2 className="size-4" />
              Regresar a {STATUS_LABEL[back]}
            </Button>
          )}
          {forward ? (
            <Button disabled={!canForward || update.isPending} onClick={() => move(forward)}>
              {canForward ? <ArrowRight className="size-4" /> : <Lock className="size-4" />}
              Avanzar a {STATUS_LABEL[forward]}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-success">
              <Check className="size-4" />
              Lista para entrega
            </span>
          )}
        </div>
        {forward && !canForward && (
          <p className="text-xs text-muted-foreground">
            Tu rol ({membership.role.name}) no puede mover la orden a {STATUS_LABEL[forward]}.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="surface-panel space-y-3 p-5">
            <h3 className="font-display text-sm font-semibold">Equipo y falla</h3>
            <p className="text-sm">
              {order.device ? `${order.device.brand} ${order.device.model}` : "Sin equipo"}
              {order.device?.imei ? ` · IMEI ${order.device.imei}` : ""}
            </p>
            <p className="text-sm text-muted-foreground">{order.reported_issue}</p>
          </section>

          <section className="surface-panel space-y-3 p-5">
            <h3 className="font-display text-sm font-semibold">Diagnóstico técnico</h3>
            <Textarea
              rows={4}
              value={diagnosis}
              disabled={!permissions.includes("diagnostics.update")}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Hallazgos, componentes dañados, pruebas realizadas…"
            />
            {permissions.includes("diagnostics.update") && (
              <Button
                size="sm"
                variant="outline"
                disabled={update.isPending}
                onClick={() => saveField({ diagnosis: diagnosis.trim() || null })}
              >
                Guardar diagnóstico
              </Button>
            )}
          </section>

          <section className="surface-panel space-y-3 p-5">
            <h3 className="font-display text-sm font-semibold">Cotización</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quote">Monto ({membership.tenant.currency})</Label>
                <Input
                  id="quote"
                  inputMode="decimal"
                  className="w-40"
                  value={quote}
                  disabled={!permissions.includes("quotes.update")}
                  onChange={(e) => setQuote(e.target.value)}
                />
              </div>
              {permissions.includes("quotes.update") && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={update.isPending}
                  onClick={() => saveField({ quoted_amount: quote.trim() ? Number(quote) : null })}
                >
                  Guardar cotización
                </Button>
              )}
            </div>
            {order.approved_at && (
              <p className="text-xs text-success">
                Aprobada el {new Date(order.approved_at).toLocaleString("es-NI")}
              </p>
            )}
          </section>

          <section className="surface-panel space-y-3 p-5">
            <h3 className="font-display text-sm font-semibold">Notas de trabajo</h3>
            <Textarea
              rows={3}
              value={workNotes}
              disabled={!canEdit}
              onChange={(e) => setWorkNotes(e.target.value)}
              placeholder="Repuestos usados, pruebas de calidad, observaciones…"
            />
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                disabled={update.isPending}
                onClick={() => saveField({ work_notes: workNotes.trim() || null })}
              >
                Guardar notas
              </Button>
            )}
          </section>
        </div>

        <section className="surface-panel space-y-4 p-5">
          <div className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            <h3 className="font-display text-sm font-semibold">Historial</h3>
          </div>
          <ol className="space-y-3">
            {(data?.history ?? []).map((h) => (
              <li key={h.id} className="border-l-2 border-border pl-3">
                <p className="text-sm">
                  {h.from_status ? `${STATUS_LABEL[h.from_status]} → ` : "Creada en "}
                  <span className="font-medium">{STATUS_LABEL[h.to_status]}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleString("es-NI")}
                </p>
                {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: RepairStatus }) {
  const index = REPAIR_FLOW.indexOf(current);
  return (
    <ol className="flex flex-wrap gap-1.5">
      {REPAIR_FLOW.map((s, i) => (
        <li
          key={s}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px]",
            i < index && "bg-success/12 text-success",
            i === index && "bg-primary text-primary-foreground",
            i > index && "bg-muted text-muted-foreground",
          )}
        >
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}
