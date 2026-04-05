import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Shield,
  Building2,
  Users,
  Ban,
  CheckCircle,
  Trash2,
  Clock,
  CreditCard,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MONTHLY_PRICE = 297.99;
const ANNUAL_PRICE = +(MONTHLY_PRICE * 12 * 0.85).toFixed(2); // 3039.50

export default function Admin() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-restaurant", {
        body: { action: "list" },
      });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ restaurant_id, status }: { restaurant_id: string; status: string }) => {
      const { error } = await supabase.functions.invoke("admin-manage-restaurant", {
        body: { action: "update_status", restaurant_id, status },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Status atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRestaurant = useMutation({
    mutationFn: async (restaurant_id: string) => {
      const { error } = await supabase.functions.invoke("admin-manage-restaurant", {
        body: { action: "delete", restaurant_id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Restaurante removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusColors: Record<string, string> = {
    trial: "bg-warning/10 text-warning border-warning/20",
    active: "bg-success/10 text-success border-success/20",
    blocked: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const statusLabels: Record<string, string> = {
    trial: "Em teste",
    active: "Ativo",
    blocked: "Bloqueado",
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Painel Admin Master</h1>
            <p className="text-muted-foreground">Gerencie todos os restaurantes da plataforma</p>
          </div>
        </div>

        {/* Pricing Info */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">Plano Mensal:</span>
                <span className="text-lg font-bold text-primary">R$ {MONTHLY_PRICE.toFixed(2)}</span>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2">
                <span className="font-medium text-foreground">Plano Anual (12x):</span>{" "}
                <span className="text-lg font-bold text-primary">R$ {ANNUAL_PRICE.toFixed(2)}</span>
                <Badge className="ml-2 bg-success text-success-foreground">-15%</Badge>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Cobranças exclusivamente no cartão de crédito</p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="stat-card">
            <CardContent className="flex items-center gap-4 p-6">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Restaurantes</p>
                <p className="text-2xl font-bold text-foreground">{restaurants?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="flex items-center gap-4 p-6">
              <CheckCircle className="h-8 w-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-foreground">
                  {restaurants?.filter((r: any) => r.status === "active").length || 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="flex items-center gap-4 p-6">
              <Clock className="h-8 w-8 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Em Teste</p>
                <p className="text-2xl font-bold text-foreground">
                  {restaurants?.filter((r: any) => r.status === "trial").length || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Restaurant List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : restaurants && restaurants.length > 0 ? (
            restaurants.map((r: any) => {
              const daysLeft = Math.max(
                0,
                Math.ceil((new Date(r.trial_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              );
              const owner = r.user_roles?.find((ur: any) => ur.role === "dono_restaurante");
              const employeeCount = r.user_roles?.filter((ur: any) => ur.role === "funcionario").length || 0;

              return (
                <Card key={r.id} className="glass-card">
                  <CardContent className="flex flex-wrap items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold text-foreground">{r.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Dono: {owner?.display_name || "—"} · {employeeCount} funcionário(s)
                      </p>
                      {r.status === "trial" && (
                        <p className="text-xs text-warning">{daysLeft} dias restantes de teste</p>
                      )}
                    </div>

                    <Badge className={statusColors[r.status] || ""}>
                      {statusLabels[r.status] || r.status}
                    </Badge>

                    <div className="flex gap-2">
                      {r.status === "blocked" || r.status === "trial" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-success/30 text-success hover:bg-success/10"
                          onClick={() => updateStatus.mutate({ restaurant_id: r.id, status: "active" })}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Ativar
                        </Button>
                      ) : null}

                      {r.status !== "blocked" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => updateStatus.mutate({ restaurant_id: r.id, status: "blocked" })}
                        >
                          <Ban className="h-4 w-4" />
                          Bloquear
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir restaurante?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso removerá permanentemente "{r.name}" e todos os dados associados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteRestaurant.mutate(r.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="flex flex-col items-center py-16">
              <Building2 className="mb-4 h-16 w-16 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum restaurante cadastrado</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
