import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Send, X, Minus, Receipt } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export default function MesaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole, user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = userRole?.restaurant_id;

  const [customerName, setCustomerName] = useState("");
  const [cart, setCart] = useState<{ menuItemId: string; name: string; price: number; quantity: number }[]>([]);

  const { data: table } = useQuery({
    queryKey: ["table", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tables").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: activeOrder } = useQuery({
    queryKey: ["active-order", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(name))")
        .eq("table_id", id!)
        .in("status", ["open", "sent_to_kitchen", "ready"] as OrderStatus[])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: menuItems } = useQuery({
    queryKey: ["menu-items", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*, menu_categories(name)")
        .eq("restaurant_id", restaurantId!)
        .eq("available", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const openTable = useMutation({
    mutationFn: async () => {
      if (!customerName.trim()) throw new Error("Informe o nome do cliente");

      // Update table status
      await supabase.from("tables").update({ status: "occupied" as const }).eq("id", id!);

      // Create order
      const { error } = await supabase.from("orders").insert({
        restaurant_id: restaurantId!,
        table_id: id!,
        customer_name: customerName,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-order", id] });
      queryClient.invalidateQueries({ queryKey: ["table", id] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Mesa aberta!");
      setCustomerName("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addToCart = (item: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === menuItemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter((c) => c.menuItemId !== menuItemId);
    });
  };

  const sendToKitchen = useMutation({
    mutationFn: async () => {
      if (!activeOrder || cart.length === 0) throw new Error("Adicione itens ao pedido");

      const items = cart.map((c) => ({
        order_id: activeOrder.id,
        menu_item_id: c.menuItemId,
        quantity: c.quantity,
        unit_price: c.price,
      }));

      const { error } = await supabase.from("order_items").insert(items);
      if (error) throw error;

      // Update order total and status
      const newTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0) + Number(activeOrder.total);
      await supabase
        .from("orders")
        .update({ status: "sent_to_kitchen" as const, total: newTotal })
        .eq("id", activeOrder.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-order", id] });
      toast.success("Pedido enviado para a cozinha!");
      setCart([]);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/mesas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Mesa {table?.number}</h1>
            <p className="text-muted-foreground">
              {table?.status === "available" ? "Livre" : `Ocupada — ${activeOrder?.customer_name || ""}`}
            </p>
          </div>
        </div>

        {!activeOrder && table?.status === "available" ? (
          <Card className="glass-card max-w-md">
            <CardHeader>
              <CardTitle className="font-display">Abrir Mesa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome do cliente</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <Button onClick={() => openTable.mutate()} disabled={!customerName.trim()} className="w-full">
                Abrir Mesa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Menu */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-display text-xl font-bold">Cardápio</h2>
              {menuItems && menuItems.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {menuItems.map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                      onClick={() => addToCart(item)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.menu_categories?.name}</p>
                          <p className="mt-1 font-bold text-primary">R$ {Number(item.price).toFixed(2)}</p>
                        </div>
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum item no cardápio. Cadastre itens primeiro.</p>
              )}

              {/* Existing order items */}
              {activeOrder?.order_items && activeOrder.order_items.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 font-display text-lg font-bold">Itens já enviados</h3>
                  <div className="space-y-2">
                    {activeOrder.order_items.map((oi: any) => (
                      <div key={oi.id} className="flex justify-between rounded-lg bg-muted/50 p-3">
                        <span>{oi.quantity}x {oi.menu_items?.name}</span>
                        <span className="text-muted-foreground">R$ {(oi.quantity * oi.unit_price).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-2 font-bold">
                      <span>Total do pedido</span>
                      <span>R$ {Number(activeOrder.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart */}
            <Card className="glass-card sticky top-4 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display">
                  <Receipt className="h-5 w-5" />
                  Novo Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Clique nos itens do cardápio para adicionar
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.menuItemId} className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">R$ {item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => removeFromCart(item.menuItemId)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price })}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-3 font-bold">
                      <span>Total</span>
                      <span className="text-primary">R$ {cartTotal.toFixed(2)}</span>
                    </div>
                    <Button onClick={() => sendToKitchen.mutate()} className="w-full" disabled={cart.length === 0}>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar para Cozinha
                    </Button>
                  </div>
                )}

                {activeOrder && (
                  <Button
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => navigate(`/caixa?order=${activeOrder.id}`)}
                  >
                    Fechar Conta
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
