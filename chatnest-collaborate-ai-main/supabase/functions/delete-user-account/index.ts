
// Edge function: deletes the authenticated user's profile (and related data), and their Supabase Auth user account

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Only allow POST
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Get Supabase client (with user's JWT from headers)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get("authorization") ?? "" } },
  });
  // For admin calls:
  const admin = createClient(supabaseUrl, supabaseServiceRole);

  // Get user from JWT
  const { data: { user }, error: userErr } = await client.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "User not authenticated" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const userId = user.id;

  // Start deletion sequence
  // (All tables with FK to user should ON DELETE CASCADE, so typically only need to delete profile & then auth user)
  // 1. Delete from `profiles`
  const { error: delProfile } = await client.from("profiles").delete().eq("id", userId);
  if (delProfile) {
    return new Response(JSON.stringify({ error: "Failed to delete profile" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
  // 2. Delete from `auth.users` (admin method, service role required)
  const { error: delAuth } = await admin.auth.admin.deleteUser(userId);
  if (delAuth) {
    return new Response(JSON.stringify({ error: "Failed to delete auth user" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: corsHeaders,
  });
});
