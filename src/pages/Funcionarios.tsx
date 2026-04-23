import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export default function Funcionarios() {
  const { userRole } = useAuth();
  const restaurantId = userRole?.restaurant_id;
  const isOwner = userRole?.role === "dono_restaurante" || userRole?.role === "admin_master";
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

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

  const createEmployee = async () => {
    if (!newUsername || !newPassword) {
      toast.error("Preencha usuário e senha");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-employees", {
        body: {
          action: "create",
          username: newUsername,
          password: newPassword,
          restaurant_id: restaurantId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Funcionário criado com sucesso!");
      setNewUsername("");
      setNewPassword("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["team-roles", restaurantId] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar funcionário");
    } finally {
      setCreating(false);
    }
  };

  const deleteEmployee = async (roleId: string, userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-employees", {
        body: { action: "delete", role_id: roleId, user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Funcionário removido!");
      queryClient.invalidateQueries({ queryKey: ["team-roles", restaurantId] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover funcionário");
    }
  };

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
          {isOwner && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Novo Funcionário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Funcionário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome de usuário</Label>
                    <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Ex: Naty" />
                    <p className="mt-1 text-xs text-muted-foreground">O funcionário fará login com este usuário (sem email).</p>
                  </div>
                  <div>
                    <Label>Senha</Label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  </div>
                  <Button className="w-full" onClick={createEmployee} disabled={creating}>
                    {creating ? "Criando..." : "Criar Funcionário"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
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
                  {isOwner && r.role === "funcionario" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover funcionário?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso removerá permanentemente "{r.display_name}" do sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteEmployee(r.id, r.user_id)}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
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
