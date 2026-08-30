import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  QrCode,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RepairFlow — Software para talleres de reparación de celulares" },
      {
        name: "description",
        content:
          "Gestiona órdenes de reparación, clientes, inventario y cobros en un solo lugar. Multi-sucursal, con seguimiento por QR para tus clientes.",
      },
      { property: "og:title", content: "RepairFlow — Gestión para talleres de celulares" },
      {
        property: "og:description",
        content: "Órdenes, clientes, inventario y cobros con seguimiento público por QR.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ClipboardList, title: "Órdenes de reparación", text: "Desde la recepción hasta la entrega y la garantía, con historial completo." },
  { icon: QrCode, title: "Seguimiento por QR", text: "Tu cliente consulta el estado de su equipo sin llamarte." },
  { icon: Smartphone, title: "Ficha del equipo", text: "IMEI, condición de ingreso, accesorios y evidencia fotográfica." },
  { icon: Users, title: "Equipo y roles", text: "Recepción, técnicos, inventario y contabilidad con permisos separados." },
  { icon: Wallet, title: "Cobros y abonos", text: "Presupuestos, anticipos y saldos pendientes siempre claros." },
  { icon: ShieldCheck, title: "Datos aislados", text: "Cada taller ve solo su información, con seguridad a nivel de base de datos." },
];

function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <BrandLogo />
        <nav className="flex items-center gap-2">
          {!loading && user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Ir al panel</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Iniciar sesión</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth">Crear cuenta</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 text-center md:px-8 md:py-24">
          <span className="inline-flex rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Multi-taller · Multi-sucursal
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-semibold tracking-tight md:text-6xl">
            El taller de celulares, ordenado de punta a punta
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            RepairFlow reúne recepción de equipos, diagnóstico, repuestos, cobros y garantía en un
            flujo único, con seguimiento público para tus clientes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to={user ? "/dashboard" : "/auth"}>
                {user ? "Ir al panel" : "Empieza gratis"}
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.title} className="surface-panel p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </span>
                <h2 className="mt-4 font-display text-base font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground md:px-8">
          © {new Date().getFullYear()} RepairFlow
        </div>
      </footer>
    </div>
  );
}
