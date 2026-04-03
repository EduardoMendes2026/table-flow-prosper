import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Users, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function Mesas() {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const restaurantId = userRole?.restaurant_id;
  const isOwner = userRole?.role === "dono_restaurante" || userRole?.role === "admin_master";

  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("4");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tables, isLoading } = useQuery({
    queryKey: ["tables", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("restaurant_id", restaurantId!)
        .order("number");
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const addTable = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tables").insert({
        restaurant_id: restaurantId!,
        number: parseInt(newTableNumber),
        capacity: parseInt(newTableCapacity),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Mesa adicionada!");
      setDialogOpen(false);
      setNewTableNumber("");
      setNewTableCapacity("4");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusColors: Record<string, string> = {
    available: "status-available",
    occupied: "status-occupied",
    reserved: "status-pending",
  };

  const statusLabels: Record<string, string> = {
    available: "Livre",
    occupied: "Ocupada",
    reserved: "Reservada",
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Mesas</h1>
            <p className="text-muted-foreground">Gerencie as mesas do seu restaurante</p>
          </div>
          {isOwner && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Mesa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Adicionar Mesa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Número da mesa</Label>
                    <Input type="number" value={newTableNumber} onChange={(e) => setNewTableNumber(e.target.value)} />
                  </div>
                  <div>
                    <Label>Capacidade</Label>
                    <Input type="number" value={newTableCapacity} onChange={(e) => setNewTableCapacity(e.target.value)} />
                  </div>
                  <Button onClick={() => addTable.mutate()} disabled={!newTableNumber} className="w-full">
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : tables && tables.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {tables.map((table) => (
              <Card
                key={table.id}
                className={cn(
                  "cursor-pointer border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
                  statusColors[table.status]
                )}
                onClick={() => navigate(`/mesas/${table.id}`)}
              >
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <Table2 className="mb-3 h-10 w-10" />
                  <p className="text-2xl font-bold">Mesa {table.number}</p>
                  <div className="mt-2 flex items-center gap-1 text-sm">
                    <Users className="h-3 w-3" />
                    <span>{table.capacity} lugares</span>
                  </div>
                  <span className="mt-2 rounded-full px-3 py-1 text-xs font-medium">
                    {statusLabels[table.status]}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <Table2 className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">Nenhuma mesa cadastrada</p>
            <p className="text-sm text-muted-foreground/60">Adicione mesas para começar a receber pedidos</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
