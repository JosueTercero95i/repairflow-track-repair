import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace, type Membership } from "@/lib/tenant";

export function WorkspaceGate({
  children,
}: {
  children: (ctx: { membership: Membership; permissions: string[]; userId: string }) => ReactNode;
}) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading, error } = useWorkspace(user?.id);

  const needsOnboarding = Boolean(data) && !data?.membership;

  useEffect(() => {
    if (needsOnboarding) void navigate({ to: "/onboarding" });
  }, [needsOnboarding, navigate]);

  if (authLoading || isLoading || needsOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Cargando</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="surface-panel max-w-sm space-y-2 p-6 text-center">
          <h2 className="font-display text-base font-semibold">No pudimos cargar tu taller</h2>
          <p className="text-sm text-muted-foreground">Vuelve a intentarlo en unos segundos.</p>
        </div>
      </div>
    );
  }

  if (!data?.membership || !user) return null;

  return <>{children({ membership: data.membership, permissions: data.permissions, userId: user.id })}</>;
}
