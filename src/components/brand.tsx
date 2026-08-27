import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "gradient-brand inline-flex size-9 items-center justify-center rounded-xl text-primary-foreground shadow-elevated",
        className,
      )}
      aria-hidden="true"
    >
      <Wrench className="size-4.5" strokeWidth={2.4} />
    </span>
  );
}

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      {!compact && (
        <span className="font-display text-lg font-semibold tracking-tight">
          Repair<span className="text-primary">Flow</span>
        </span>
      )}
    </span>
  );
}
