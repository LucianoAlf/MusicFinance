import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth header" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: admin } = await adminClient
      .from("superadmins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!admin) return json({ error: "Forbidden: not a superadmin" }, 403);

    const { email } = await req.json();
    if (!email || typeof email !== "string") return json({ error: "Email is required" }, 400);
    const trimmedEmail = email.toLowerCase().trim();

    const { data: existingPending } = await adminClient
      .from("invites")
      .select("id")
      .eq("email", trimmedEmail)
      .eq("status", "pending")
      .maybeSingle();
    if (existingPending) return json({ error: "Ja existe um convite pendente para este email" }, 409);

    // Send invite email through GoTrue endpoint.
    const inviteRes = await fetch(`${supabaseUrl}/auth/v1/invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: trimmedEmail }),
    });
    if (!inviteRes.ok) {
      const errBody = await inviteRes.text();
      return json({ error: `Erro ao enviar convite: ${errBody}` }, inviteRes.status);
    }

    const inviteData = await inviteRes.json();
    const invitedUserId: string | undefined = inviteData?.id;

    // Pre-provision tenant mapping now, so mentee appears immediately after acceptance.
    if (invitedUserId) {
      const { data: hasTenantUser } = await adminClient
        .from("tenant_users")
        .select("id")
        .eq("user_id", invitedUserId)
        .maybeSingle();

      if (!hasTenantUser) {
        const defaultName = trimmedEmail.split("@")[0] || "mentorado";
        const { data: tenant, error: tenantError } = await adminClient
          .from("tenants")
          .insert({ name: defaultName, email: trimmedEmail })
          .select("id")
          .maybeSingle();

        if (tenantError) return json({ error: tenantError.message }, 400);
        if (tenant?.id) {
          const { error: linkError } = await adminClient
            .from("tenant_users")
            .insert({ tenant_id: tenant.id, user_id: invitedUserId, role: "owner", status: "active" });
          if (linkError) return json({ error: linkError.message }, 400);
        }
      }
    }

    await adminClient.from("invites").insert({
      email: trimmedEmail,
      invited_by: user.id,
      status: "pending",
    });

    return json({ success: true, userId: invitedUserId });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
