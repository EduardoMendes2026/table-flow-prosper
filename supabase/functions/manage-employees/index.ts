import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Verify caller is dono_restaurante or admin_master
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", user.id);

    const ownerRole = callerRoles?.find(
      (r: any) => r.role === "dono_restaurante" || r.role === "admin_master"
    );
    if (!ownerRole) throw new Error("Access denied");

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { username, password, restaurant_id } = body;
      const targetRestaurantId = restaurant_id || ownerRole.restaurant_id;
      if (!targetRestaurantId) throw new Error("Restaurante não definido");

      if (!username || !password) throw new Error("Usuário e senha são obrigatórios");
      if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres");

      // Check uniqueness of username (display_name) globally to avoid collisions in resolve-username
      const { data: existing } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .ilike("display_name", username)
        .limit(1)
        .maybeSingle();
      if (existing) throw new Error("Este nome de usuário já existe");

      // Generate synthetic email from username (internal use only)
      const safeUser = String(username).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!safeUser) throw new Error("Nome de usuário inválido");
      const syntheticEmail = `${safeUser}.${targetRestaurantId.slice(0, 8)}@employee.local`;

      // Create user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
      });
      if (createError) throw createError;

      // Assign funcionario role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: newUser.user.id,
          role: "funcionario",
          restaurant_id: targetRestaurantId,
          display_name: username,
        });
      if (roleError) throw roleError;

      return new Response(
        JSON.stringify({ success: true, userId: newUser.user.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const { role_id, user_id: targetUserId } = body;

      // Delete role
      await supabaseAdmin.from("user_roles").delete().eq("id", role_id);

      // Delete auth user
      if (targetUserId) {
        await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
