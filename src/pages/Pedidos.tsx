import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";

const statusLabels: Record<string, string> = {
  open: "Aberto",
  sent_to_kitchen: "Na cozinha",
  ready: "Pronto",
  closed: "Fechado",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "outline",
  sent_to_kitchen: "secondary",
  ready: "default",
  closed: "destructive",
};

export default function Pedidos() {
  const { userRole } = useAuth();
  const restaurantId = userRole?.restaurant_id;

  const { data: orders } = useQuery({
    queryKey: ["all-orders", restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, tables(number), order_items(quantity, unit_price, menu_items(name))")
        .eq("restaurant_id", restaurantId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!restaurantId,
  });

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground">Histórico de pedidos</p>
        </div>

        {orders && orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order: any) => (
              <Card key={order.id} className="transition-all hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Mesa {order.tables?.number} — {order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("pt-BR")} • {order.order_items?.length || 0} itens
                    </p>
                  </div>
                  <p className="font-bold text-primary">R$ {Number(order.total).toFixed(2)}</p>
                  <Badge variant={statusVariants[order.status]}>{statusLabels[order.status]}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum pedido registrado</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
