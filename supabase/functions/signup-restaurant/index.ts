import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { restaurantName, email, password } = await req.json();

    if (!restaurantName || !email || !password) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check existing email
    const { data: list } = await admin.auth.admin.listUsers();
    if (list?.users?.some((u) => u.email?.toLowerCase() === String(email).toLowerCase())) {
      return new Response(JSON.stringify({ error: "Email já cadastrado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { restaurant_name: restaurantName },
    });
    if (createErr) throw createErr;
    const userId = created.user.id;

    // Create restaurant (7 day trial)
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const { data: rest, error: restErr } = await admin
      .from("restaurants")
      .insert({
        name: restaurantName,
        status: "trial",
        trial_started_at: trialStart.toISOString(),
        trial_expires_at: trialEnd.toISOString(),
      })
      .select()
      .single();

    if (restErr) {
      await admin.auth.admin.deleteUser(userId);
      throw restErr;
    }

    // Assign owner role
    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: userId,
      role: "dono_restaurante",
      restaurant_id: rest.id,
      display_name: restaurantName,
    });
    if (roleErr) {
      await admin.from("restaurants").delete().eq("id", rest.id);
      await admin.auth.admin.deleteUser(userId);
      throw roleErr;
    }

    return new Response(
      JSON.stringify({ success: true, restaurantId: rest.id, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});