import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Smartphone,
  ClipboardList,
  Boxes,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand";
import { cn } from "@/lib/utils";
import type { Membership } from "@/lib/tenant";

type NavItem = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  soon?: boolean;
};

const NAV: NavItem[] = [
  { label: "Panel", to: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "Clientes", to: "/dashboard", icon: Users, permission: "customers.view", soon: true },
  { label: "Dispositivos", to: "/dashboard", icon: Smartphone, permission: "devices.view", soon: true },
  { label: "Reparaciones", to: "/dashboard", icon: ClipboardList, permission: "repairs.view", soon: true },
  { label: "Inventario", to: "/dashboard", icon: Boxes, permission: "inventory.view", soon: true },
  { label: "Pagos", to: "/dashboard", icon: Receipt, permission: "payments.view", soon: true },
  { label: "Reportes", to: "/dashboard", icon: BarChart3, permission: "reports.view", soon: true },
  { label: "Configuración", to: "/settings", icon: Settings, permission: "settings.view" },
];

export function AppShell({
  membership,
  permissions,
  title,
  description,
  actions,
  children,
}: {
  membership: Membership;
  permissions: string[];
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  }

  const items = NAV.filter((item) => !item.permission || permissions.includes(item.permission));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <BrandLogo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="border-b border-sidebar-border px-4 py-3">
          <p className="truncate text-sm font-semibold">{membership.tenant.name}</p>
          <p className="text-xs text-sidebar-foreground/60">
            {membership.role.name} · {membership.tenant.status === "TRIAL" ? "Prueba" : "Activo"}
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active && !item.soon
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.soon && (
                  <span className="rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sidebar-foreground/60">
                    pronto
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md p-2 hover:bg-muted lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-semibold md:text-lg">{title}</h1>
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-success/12 text-success",
    TRIAL: "bg-info/12 text-info",
    SUSPENDED: "bg-warning/15 text-warning-foreground",
    CANCELLED: "bg-destructive/12 text-destructive",
  };
  const labels: Record<string, string> = {
    ACTIVE: "Activo",
    TRIAL: "Prueba",
    SUSPENDED: "Suspendido",
    CANCELLED: "Cancelado",
  };
  return (
    <Badge variant="secondary" className={cn("border-0", map[status] ?? "")}>
      {labels[status] ?? status}
    </Badge>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof LayoutDashboard;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export { Button };
