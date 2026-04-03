import { useState } from "react";
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
import { CreditCard, Banknote, QrCode, Smartphone, DollarSign, Printer } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type PaymentMethodType = Database["public"]["Enums"]["payment_method"];

export default function Caixa() {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const selectedOrderId = searchParams.get("order");
  const restaurantId = userRole?.restaurant_id;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("pix");
  const [cashAmount, setCashAmount] = useState("");

  const { data: orders } = useQuery({
    queryKey: ["cashier-orders", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, tables(number), order_items(*, menu_items(name))")
        .eq("restaurant_id", restaurantId!)
        .in("status", ["ready", "sent_to_kitchen", "open"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const [activeOrderId, setActiveOrderId] = useState<string | null>(selectedOrderId);
  const activeOrder = orders?.find((o) => o.id === activeOrderId);

  const closeOrder = useMutation({
    mutationFn: async () => {
      if (!activeOrder) throw new Error("Selecione um pedido");

      const total = Number(activeOrder.total);
      const paid = paymentMethod === "cash" ? parseFloat(cashAmount) : total;
      const change = paymentMethod === "cash" ? Math.max(0, paid - total) : 0;

      if (paymentMethod === "cash" && paid < total) {
        throw new Error("Valor insuficiente");
      }

      const { error: payError } = await supabase.from("payments").insert({
        order_id: activeOrder.id,
        method: paymentMethod,
        amount: total,
        change_amount: change,
      });
      if (payError) throw payError;

      await supabase.from("orders").update({ status: "closed" as const }).eq("id", activeOrder.id);
      await supabase.from("tables").update({ status: "available" as const }).eq("id", activeOrder.table_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });
      toast.success("Conta fechada com sucesso!");
      setActiveOrderId(null);
      setCashAmount("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const methods: { value: PaymentMethodType; label: string; icon: any }[] = [
    { value: "pix", label: "PIX", icon: QrCode },
    { value: "credit", label: "Crédito", icon: CreditCard },
    { value: "debit", label: "Débito", icon: Smartphone },
    { value: "cash", label: "Dinheiro", icon: Banknote },
  ];

  const changeAmount = paymentMethod === "cash" && activeOrder
    ? Math.max(0, parseFloat(cashAmount || "0") - Number(activeOrder.total))
    : 0;

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Caixa</h1>
          <p className="text-muted-foreground">Fechar contas e processar pagamentos</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Order list */}
          <div className="space-y-3 lg:col-span-1">
            <h2 className="font-display text-lg font-bold">Pedidos Abertos</h2>
            {orders?.map((order: any) => (
              <Card
                key={order.id}
                className={`cursor-pointer transition-all hover:shadow-md ${activeOrderId === order.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setActiveOrderId(order.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">Mesa {order.tables?.number}</p>
                      <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">R$ {Number(order.total).toFixed(2)}</p>
                      <Badge variant="secondary" className="text-xs">{order.status === "ready" ? "Pronto" : "Em preparo"}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!orders || orders.length === 0) && (
              <p className="py-8 text-center text-muted-foreground">Nenhum pedido aberto</p>
            )}
          </div>

          {/* Payment */}
          <div className="lg:col-span-2">
            {activeOrder ? (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="font-display">
                    Mesa {(activeOrder as any).tables?.number} — {activeOrder.customer_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    {(activeOrder as any).order_items?.map((oi: any) => (
                      <div key={oi.id} className="flex justify-between">
                        <span>{oi.quantity}x {oi.menu_items?.name}</span>
                        <span>R$ {(oi.quantity * oi.unit_price).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-3 text-xl font-bold">
                      <span>Total</span>
                      <span className="text-primary">R$ {Number(activeOrder.total).toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block text-lg font-medium">Forma de pagamento</Label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {methods.map((m) => (
                        <Button
                          key={m.value}
                          variant={paymentMethod === m.value ? "default" : "outline"}
                          className="flex flex-col gap-1 py-4"
                          onClick={() => setPaymentMethod(m.value)}
                        >
                          <m.icon className="h-5 w-5" />
                          <span className="text-xs">{m.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === "cash" && (
                    <div className="space-y-2">
                      <Label>Valor recebido (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="0.00"
                      />
                      {changeAmount > 0 && (
                        <p className="text-lg font-bold text-success">
                          Troco: R$ {changeAmount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full text-lg"
                    onClick={() => closeOrder.mutate()}
                    disabled={paymentMethod === "cash" && parseFloat(cashAmount || "0") < Number(activeOrder.total)}
                  >
                    <DollarSign className="mr-2 h-5 w-5" />
                    Fechar Conta
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <DollarSign className="mb-4 h-16 w-16 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground">Selecione um pedido para fechar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
