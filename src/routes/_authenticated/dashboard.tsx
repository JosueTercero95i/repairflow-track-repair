import { createFileRoute } from "@tanstack/react-router";
import {
  ClipboardList,
  Clock,
  Smartphone,
  Users,
  Wallet,
  Rocket,
} from "lucide-react";
import { AppShell, EmptyState, StatusBadge } from "@/components/app-shell";
import { WorkspaceGate } from "@/components/workspace-gate";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Panel — RepairFlow" },
      { name: "description", content: "Resumen operativo de tu taller: reparaciones, clientes y cobros." },
      { property: "og:title", content: "Panel — RepairFlow" },
      { property: "og:description", content: "Resumen operativo diario de tu taller de reparación." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DashboardPage,
});

const KPIS = [
  { label: "Órdenes abiertas", value: "0", icon: ClipboardList, hint: "En proceso hoy" },
  { label: "Equipos recibidos", value: "0", icon: Smartphone, hint: "Últimos 7 días" },
  { label: "Clientes", value: "0", icon: Users, hint: "Registrados" },
  { label: "Por cobrar", value: "0.00", icon: Wallet, hint: "Saldo pendiente" },
];

function DashboardPage() {
  return (
    <WorkspaceGate>
      {({ membership }) => (
        <AppShell
          membership={membership}
          permissions={[]}
          title="Panel"
          description={`${membership.tenant.name} · ${membership.role.name}`}
          actions={<StatusBadge status={membership.tenant.status} />}
        >
          <DashboardBody currency={membership.tenant.currency} />
        </AppShell>
      )}
    </WorkspaceGate>
  );
}

function DashboardBody({ currency }: { currency: string }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="surface-panel p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{kpi.label}</span>
              <kpi.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold">
              {kpi.label === "Por cobrar" ? `${currency} ${kpi.value}` : kpi.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EmptyState
            icon={ClipboardList}
            title="Aún no hay reparaciones"
            description="Cuando registres tu primera orden de servicio verás aquí su estado, técnico asignado y tiempos de entrega."
            action={<Button disabled>Nueva orden (pronto)</Button>}
          />
        </div>
        <div className="surface-panel space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Rocket className="size-4 text-primary" />
            <h2 className="font-display text-sm font-semibold">Siguientes pasos</h2>
          </div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              Completa los datos de tu taller en Configuración.
            </li>
            <li className="flex gap-2">
              <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              Invita a tu equipo y asigna roles (próximamente).
            </li>
            <li className="flex gap-2">
              <Smartphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              Registra tu primer equipo y genera su código de seguimiento.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
