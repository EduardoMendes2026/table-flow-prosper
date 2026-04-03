import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant } from "@/hooks/useRestaurant";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const { userRole } = useAuth();
  const { data: restaurant } = useRestaurant();
  const restaurantId = userRole?.restaurant_id;

  const { data: todayOrders } = useQuery({
    queryKey: ["dashboard-orders", restaurantId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("orders")
        .select("id, total, status, created_at")
        .eq("restaurant_id", restaurantId!)
        .gte("created_at", today + "T00:00:00")
        .lte("created_at", today + "T23:59:59");
      return data || [];
    },
    enabled: !!restaurantId,
  });

  const { data: activeTables } = useQuery({
    queryKey: ["dashboard-tables", restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tables")
        .select("id, status")
        .eq("restaurant_id", restaurantId!);
      return data || [];
    },
    enabled: !!restaurantId,
  });

  const { data: topItems } = useQuery({
    queryKey: ["dashboard-top-items", restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("quantity, menu_item_id, menu_items(name)")
        .order("quantity", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!restaurantId,
  });

  const totalRevenue = todayOrders?.filter(o => o.status === "closed").reduce((sum, o) => sum + Number(o.total), 0) || 0;
  const totalOrders = todayOrders?.length || 0;
  const occupiedTables = activeTables?.filter(t => t.status === "occupied").length || 0;
  const totalTables = activeTables?.length || 0;

  const stats = [
    { label: "Faturamento Hoje", value: `R$ ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-success" },
    { label: "Pedidos Hoje", value: totalOrders, icon: ShoppingBag, color: "text-primary" },
    { label: "Mesas Ocupadas", value: `${occupiedTables}/${totalTables}`, icon: Users, color: "text-info" },
    { label: "Ticket Médio", value: `R$ ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00"}`, icon: TrendingUp, color: "text-warning" },
  ];

  const chartData = [
    { name: "Seg", valor: 0 },
    { name: "Ter", valor: 0 },
    { name: "Qua", valor: 0 },
    { name: "Qui", valor: 0 },
    { name: "Sex", valor: 0 },
    { name: "Sáb", valor: 0 },
    { name: "Dom", valor: 0 },
  ];

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Olá, {userRole?.display_name || "Proprietário"}! 👋
          </h1>
          <p className="text-muted-foreground">
            {restaurant?.name} — Resumo do dia
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="stat-card">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Faturamento Semanal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Itens Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {topItems && topItems.length > 0 ? (
                <div className="space-y-3">
                  {topItems.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="font-medium text-foreground">{item.menu_items?.name || "Item"}</span>
                      <span className="text-sm text-muted-foreground">{item.quantity}x vendidos</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  Nenhum pedido registrado ainda
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
