import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant } from "@/hooks/useRestaurant";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";

export default function Configuracoes() {
  const { data: restaurant } = useRestaurant();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name);
      setAddress(restaurant.address || "");
      setPhone(restaurant.phone || "");
    }
  }, [restaurant]);

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("restaurants")
        .update({ name, address, phone })
        .eq("id", restaurant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant"] });
      toast.success("Dados atualizados!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground">Configurações</h1>
        </div>

        <Card className="glass-card max-w-lg">
          <CardHeader>
            <CardTitle className="font-display">Dados do Restaurante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Endereço</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <Button onClick={() => update.mutate()} className="w-full">
              <Save className="mr-2 h-4 w-4" />Salvar
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
