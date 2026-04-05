import { useTrialStatus } from "@/hooks/useRestaurant";
import { AlertTriangle, CreditCard, Star, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MONTHLY_PRICE = 297.99;
const ANNUAL_TOTAL = +(MONTHLY_PRICE * 12 * 0.85).toFixed(2);
const ANNUAL_MONTHLY = +(ANNUAL_TOTAL / 12).toFixed(2);

export function TrialOverlay() {
  const { isExpired } = useTrialStatus();

  if (!isExpired) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto py-8">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative z-10 mx-4 w-full max-w-2xl animate-fade-in space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="mb-2 font-display text-2xl font-bold text-foreground">
            Período de teste expirado
          </h2>
          <p className="text-muted-foreground">
            Seu período de teste de 7 dias terminou. Escolha um plano para continuar usando o sistema.
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Monthly */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-bold text-foreground">Plano Mensal</h3>
            </div>
            <p className="mb-1 text-3xl font-bold text-foreground">
              R$ {MONTHLY_PRICE.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
            <p className="mb-4 text-sm text-muted-foreground">Cobrado no cartão de crédito</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> Acesso completo ao sistema</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> Mesas e pedidos ilimitados</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> Suporte prioritário</li>
            </ul>
            <a
              href="mailto:contato@seusistema.com?subject=Ativar Plano Mensal"
              className="mt-6 block rounded-lg bg-muted px-6 py-3 text-center font-medium text-foreground transition-colors hover:bg-muted/80"
            >
              Escolher Mensal
            </a>
          </div>

          {/* Annual - highlighted */}
          <div className="relative rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 shadow-xl ring-2 ring-primary/20">
            <Badge className="absolute -top-3 right-4 gap-1 bg-primary px-3 py-1 text-primary-foreground shadow-lg">
              <Star className="h-3 w-3" /> MAIS POPULAR
            </Badge>
            <div className="mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-bold text-foreground">Plano Anual</h3>
            </div>
            <p className="mb-1 text-3xl font-bold text-primary">
              R$ {ANNUAL_MONTHLY.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
            <p className="mb-1 text-sm text-muted-foreground">
              12x no cartão · Total: <span className="font-semibold text-foreground">R$ {ANNUAL_TOTAL.toFixed(2)}</span>
            </p>
            <Badge variant="outline" className="mb-4 border-success/30 text-success">
              Economize 15% — R$ {(MONTHLY_PRICE * 12 - ANNUAL_TOTAL).toFixed(2)} de desconto
            </Badge>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> Tudo do plano mensal</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> 15% de desconto garantido</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> Acesso por 12 meses</li>
            </ul>
            <a
              href="mailto:contato@seusistema.com?subject=Ativar Plano Anual"
              className="mt-6 block rounded-lg bg-primary px-6 py-3 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/90 shadow-lg"
            >
              Escolher Anual — Melhor Oferta
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Pagamento exclusivamente via cartão de crédito. Entre em contato para ativar seu plano.
        </p>
      </div>
    </div>
  );
}
