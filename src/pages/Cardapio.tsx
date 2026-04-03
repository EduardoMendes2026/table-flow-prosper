import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UtensilsCrossed } from "lucide-react";

export default function Cardapio() {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = userRole?.restaurant_id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [catName, setCatName] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["menu-categories", restaurantId],
    queryFn: async () => {
      const { data } = await supabase.from("menu_categories").select("*").eq("restaurant_id", restaurantId!).order("sort_order");
      return data || [];
    },
    enabled: !!restaurantId,
  });

  const { data: items } = useQuery({
    queryKey: ["menu-items-all", restaurantId],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("*, menu_categories(name)").eq("restaurant_id", restaurantId!).order("name");
      return data || [];
    },
    enabled: !!restaurantId,
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("menu_categories").insert({ restaurant_id: restaurantId!, name: catName });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      toast.success("Categoria adicionada!");
      setCatDialogOpen(false);
      setCatName("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const saveItem = useMutation({
    mutationFn: async () => {
      const payload = {
        restaurant_id: restaurantId!,
        name: itemName,
        description: itemDesc || null,
        price: parseFloat(itemPrice),
        category_id: itemCategoryId || null,
      };
      if (editingItem) {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menu_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast.success(editingItem ? "Item atualizado!" : "Item adicionado!");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast.success("Item removido!");
    },
  });

  const toggleAvailability = async (id: string, available: boolean) => {
    await supabase.from("menu_items").update({ available: !available }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["menu-items"] });
  };

  const resetForm = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setItemName("");
    setItemDesc("");
    setItemPrice("");
    setItemCategoryId("");
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDesc(item.description || "");
    setItemPrice(String(item.price));
    setItemCategoryId(item.category_id || "");
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Cardápio</h1>
            <p className="text-muted-foreground">Gerencie os itens do cardápio</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Nova Categoria</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Nova Categoria</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Nome</Label><Input value={catName} onChange={(e) => setCatName(e.target.value)} /></div>
                  <Button onClick={() => addCategory.mutate()} disabled={!catName} className="w-full">Adicionar</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Novo Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">{editingItem ? "Editar" : "Novo"} Item</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Nome</Label><Input value={itemName} onChange={(e) => setItemName(e.target.value)} /></div>
                  <div><Label>Descrição</Label><Input value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} /></div>
                  <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} /></div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={itemCategoryId} onValueChange={setItemCategoryId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => saveItem.mutate()} disabled={!itemName || !itemPrice} className="w-full">
                    {editingItem ? "Salvar" : "Adicionar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {items && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item: any) => (
              <Card key={item.id} className={`transition-all ${!item.available ? "opacity-50" : ""}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <UtensilsCrossed className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.menu_categories?.name || "Sem categoria"} • {item.description}</p>
                  </div>
                  <p className="text-lg font-bold text-primary">R$ {Number(item.price).toFixed(2)}</p>
                  <Switch checked={item.available} onCheckedChange={() => toggleAvailability(item.id, item.available)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <UtensilsCrossed className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum item no cardápio</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
