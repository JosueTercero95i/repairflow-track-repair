import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar contraseña — RepairFlow" },
      { name: "description", content: "Solicita un enlace para restablecer tu contraseña de RepairFlow." },
      { property: "og:title", content: "Recuperar contraseña — RepairFlow" },
      { property: "og:description", content: "Solicita un enlace para restablecer tu contraseña." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <BrandLogo />
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">Recuperar contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Te enviamos un enlace seguro para crear una contraseña nueva.
          </p>
        </div>

        {sent ? (
          <div className="surface-panel space-y-3 p-5 text-sm">
            <p>
              Si <span className="font-medium">{email}</span> tiene una cuenta, recibirás el enlace en unos
              minutos.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth">Volver a iniciar sesión</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Enviar enlace
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              <Link to="/auth" className="hover:underline">
                Volver a iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
