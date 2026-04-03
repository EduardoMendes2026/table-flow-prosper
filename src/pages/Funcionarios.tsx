import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Funcionarios() {
  const { userRole } = useAuth();
  const restaurantId = userRole?.restaurant_id;

  const { data: roles } = useQuery({
    queryKey: ["team-roles", restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("*")
        .eq("restaurant_id", restaurantId!);
      return data || [];
    },
    enabled: !!restaurantId,
  });

  const roleLabels: Record<string, string> = {
    dono_restaurante: "Proprietário",
    funcionario: "Funcionário",
    admin_master: "Admin",
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Funcionários</h1>
            <p className="text-muted-foreground">Gerencie sua equipe</p>
          </div>
          <Button onClick={() => toast.info("Para adicionar funcionários, crie uma conta e associe ao restaurante via painel admin.")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Funcionário
          </Button>
        </div>

        {roles && roles.length > 0 ? (
          <div className="space-y-3">
            {roles.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{r.display_name || "Sem nome"}</p>
                  </div>
                  <Badge variant="secondary">{roleLabels[r.role] || r.role}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum funcionário cadastrado</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
