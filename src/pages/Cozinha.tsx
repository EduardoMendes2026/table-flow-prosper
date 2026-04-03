import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Clock, CookingPot } from "lucide-react";

export default function Cozinha() {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = userRole?.restaurant_id;

  const { data: kitchenOrders } = useQuery({
    queryKey: ["kitchen-orders", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, tables(number), order_items(*, menu_items(name))")
        .eq("restaurant_id", restaurantId!)
        .in("status", ["sent_to_kitchen", "ready"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel("kitchen-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, queryClient]);

  const markReady = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ status: "ready" as const }).eq("id", orderId);
    if (error) {
      toast.error("Erro ao atualizar pedido");
    } else {
      toast.success("Pedido pronto!");
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    }
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-3">
          <CookingPot className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Cozinha</h1>
            <p className="text-muted-foreground">Pedidos em tempo real</p>
          </div>
          <Badge variant="outline" className="ml-auto animate-pulse-soft">
            <span className="mr-1.5 h-2 w-2 rounded-full bg-success inline-block" />
            Ao vivo
          </Badge>
        </div>

        {kitchenOrders && kitchenOrders.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kitchenOrders.map((order: any) => (
              <Card
                key={order.id}
                className={`border-2 transition-all ${order.status === "ready" ? "border-success/50 bg-success/5" : "border-warning/50 bg-warning/5"}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-lg">Mesa {order.tables?.number}</CardTitle>
                    <Badge variant={order.status === "ready" ? "default" : "secondary"}>
                      {order.status === "ready" ? "Pronto" : "Preparando"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.customer_name} • <Clock className="inline h-3 w-3" /> {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {order.order_items?.map((oi: any) => (
                      <div key={oi.id} className="flex justify-between text-sm">
                        <span className="font-medium">{oi.quantity}x {oi.menu_items?.name}</span>
                        {oi.notes && <span className="text-xs text-muted-foreground italic">{oi.notes}</span>}
                      </div>
                    ))}
                  </div>
                  {order.status === "sent_to_kitchen" && (
                    <Button className="mt-4 w-full" onClick={() => markReady(order.id)}>
                      <Check className="mr-2 h-4 w-4" />
                      Marcar como Pronto
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <CookingPot className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum pedido na cozinha</p>
            <p className="text-sm text-muted-foreground/60">Os pedidos aparecerão aqui em tempo real</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
