import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "Eduardo@gmail.com";
const ADMIN_PASSWORD = "admin123";

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

    // Remove old admins (admin@system.com and any existing Eduardo@gmail.com to recreate clean)
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const toRemove = existingUsers?.users?.filter(
      (u) =>
        u.email?.toLowerCase() === "admin@system.com" ||
        u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    ) ?? [];

    for (const u of toRemove) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", u.id);
      await supabaseAdmin.auth.admin.deleteUser(u.id);
    }

    // Create the new admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    if (createError) throw createError;

    // Assign admin_master role (no restaurant)
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: "admin_master",
      display_name: "Admin Master",
    });

    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({
        message: "Admin recriado com sucesso",
        email: ADMIN_EMAIL,
        userId: newUser.user.id,
        removed: toRemove.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
