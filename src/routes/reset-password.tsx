import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nueva contraseña — RepairFlow" },
      { name: "description", content: "Define una nueva contraseña para tu cuenta de RepairFlow." },
      { property: "og:title", content: "Nueva contraseña — RepairFlow" },
      { property: "og:description", content: "Define una nueva contraseña para tu cuenta." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada.");
    void navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <BrandLogo />
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">Nueva contraseña</h1>
          <p className="text-sm text-muted-foreground">Elige una contraseña de al menos 8 caracteres.</p>
        </div>

        {hasSession === false ? (
          <div className="surface-panel space-y-3 p-5 text-sm">
            <p>El enlace expiró o no es válido. Solicita uno nuevo.</p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/forgot-password">Solicitar enlace</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input
                id="confirm"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || hasSession === null}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Guardar contraseña
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
