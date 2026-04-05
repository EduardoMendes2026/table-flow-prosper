import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

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
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", user.id)
      .single();

    if (!callerRole || (callerRole.role !== "dono_restaurante" && callerRole.role !== "admin_master")) {
      throw new Error("Access denied");
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, display_name, restaurant_id } = body;
      const targetRestaurantId = restaurant_id || callerRole.restaurant_id;

      // Create user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
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
          display_name,
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
