import { useTrialStatus } from "@/hooks/useRestaurant";
import { AlertTriangle } from "lucide-react";

export function TrialOverlay() {
  const { isExpired } = useTrialStatus();

  if (!isExpired) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative z-10 mx-4 max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-2xl animate-fade-in">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="mb-2 font-display text-2xl font-bold text-foreground">
          Período de teste expirado
        </h2>
        <p className="text-muted-foreground">
          Seu período de teste de 7 dias terminou. Entre em contato para ativar o sistema completo.
        </p>
        <a
          href="mailto:contato@seusistema.com"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Entrar em contato
        </a>
      </div>
    </div>
  );
}
