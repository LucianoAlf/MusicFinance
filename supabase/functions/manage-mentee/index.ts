import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  Deno.env.get("ALLOWED_ORIGIN") || "",
].filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

type Action = "pause" | "activate" | "delete";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(req, { error: "Missing auth header" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) return json(req, { error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: admin } = await adminClient
      .from("superadmins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!admin) return json(req, { error: "Forbidden: not a superadmin" }, 403);

    const payload = await req.json();
    const action = payload?.action as Action;
    const userId = payload?.userId as string;

    if (!action || !["pause", "activate", "delete"].includes(action)) {
      return json(req, { error: "Action invalida" }, 400);
    }

    if (!userId || typeof userId !== "string") {
      return json(req, { error: "userId invalido" }, 400);
    }

    if (userId === user.id) {
      return json(req, { error: "Voce nao pode alterar sua propria conta" }, 400);
    }

    if (action === "pause" || action === "activate") {
      const nextStatus = action === "pause" ? "paused" : "active";

      const { error: updateError } = await adminClient
        .from("tenant_users")
        .update({ status: nextStatus })
        .eq("user_id", userId);

      if (updateError) return json(req, { error: updateError.message }, 400);
      return json(req, { success: true, status: nextStatus });
    }

    const { data: links, error: linksError } = await adminClient
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", userId);

    if (linksError) return json(req, { error: linksError.message }, 400);

    const tenantIds = [...new Set((links || []).map((l) => l.tenant_id).filter(Boolean))] as string[];

    const { error: invitesError } = await adminClient.from("invites").delete().eq("email", (
      await adminClient.auth.admin.getUserById(userId)
    ).data.user?.email || "");
    if (invitesError) return json(req, { error: invitesError.message }, 400);

    const { error: linkDeleteError } = await adminClient.from("tenant_users").delete().eq("user_id", userId);
    if (linkDeleteError) return json(req, { error: linkDeleteError.message }, 400);

    for (const tenantId of tenantIds) {
      const { count } = await adminClient
        .from("tenant_users")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      if ((count || 0) === 0) {
        await adminClient.from("schools").delete().eq("tenant_id", tenantId);
        await adminClient.from("tenants").delete().eq("id", tenantId);
      }
    }

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) return json(req, { error: authDeleteError.message }, 400);

    return json(req, { success: true, deleted: true });
  } catch (err) {
    return json(req, { error: String(err) }, 500);
  }
});
