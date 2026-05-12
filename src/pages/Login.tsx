import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { UtensilsCrossed, User, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  // Login by email
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Login by username (employee)
  const [loginUsername, setLoginUsername] = useState("");
  const [loginUserPassword, setLoginUserPassword] = useState("");

  // Login mode
  const [loginMode, setLoginMode] = useState<"email" | "username">("email");

  // Signup (restaurant only)
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      toast.success("Login realizado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Resolve username to email via edge function
      const { data, error } = await supabase.functions.invoke("resolve-username", {
        body: { username: loginUsername },
      });

      if (error || !data?.email) {
        throw new Error(data?.error || "Usuário não encontrado");
      }

      await signIn(data.email, loginUserPassword);
      toast.success("Login realizado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("signup-restaurant", {
        body: { restaurantName: signupName, email: signupEmail, password: signupPassword },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Erro ao cadastrar");
      await signIn(signupEmail, signupPassword);
      toast.success("Restaurante cadastrado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <UtensilsCrossed className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">RestaurantePro</h1>
          <p className="mt-1 text-muted-foreground">Sistema de gestão para restaurantes</p>
        </div>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Bem-vindo</CardTitle>
            <CardDescription>Acesse ou cadastre seu restaurante</CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar Restaurante</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                {/* Toggle login mode */}
                <div className="mb-4 flex gap-2">
                  <Button
                    type="button"
                    variant={loginMode === "email" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => setLoginMode("email")}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={loginMode === "username" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => setLoginMode("username")}
                  >
                    <User className="h-4 w-4" />
                    Usuário
                  </Button>
                </div>

                {loginMode === "email" ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email">Email</Label>
                      <Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="login-password">Senha</Label>
                      <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleUsernameLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-username">Nome de usuário</Label>
                      <Input
                        id="login-username"
                        placeholder='Ex: Naty'
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-user-password">Senha</Label>
                      <Input id="login-user-password" type="password" value={loginUserPassword} onChange={(e) => setLoginUserPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Entrando..." : "Entrar como Funcionário"}
                    </Button>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name">Nome do Restaurante</Label>
                    <Input id="signup-name" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input id="signup-password" type="password" minLength={6} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Cadastrando..." : "Cadastrar Restaurante"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Apenas restaurantes podem se cadastrar. Funcionários são adicionados pelo proprietário.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
