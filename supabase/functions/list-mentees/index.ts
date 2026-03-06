import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STATIC_ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:5173"];

function getConfiguredOrigins() {
  const single = Deno.env.get("ALLOWED_ORIGIN") || "";
  const list = Deno.env.get("ALLOWED_ORIGINS") || "";
  return [
    single,
    ...list
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  ];
}

function isLocalNetworkOrigin(origin: string) {
  return /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):(\d+)$/.test(
    origin,
  );
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = [...STATIC_ALLOWED_ORIGINS, ...getConfiguredOrigins()];
  const allowOriginByRule =
    allowedOrigins.includes(origin) || isLocalNetworkOrigin(origin);
  const allowedOrigin = allowOriginByRule ? origin : origin || STATIC_ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    Vary: "Origin",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: admin } = await adminClient
      .from("superadmins")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    if (!admin) {
      return new Response(JSON.stringify({ error: "Forbidden: not a superadmin" }), {
        status: 403,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: tenantUsers } = await adminClient
      .from("tenant_users")
      .select("user_id, tenant_id, role, status, created_at");

    if (!tenantUsers || tenantUsers.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const mentees = await Promise.all(
      tenantUsers.map(async (tu) => {
        const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(tu.user_id);

        const { data: schools } = await adminClient
          .from("schools")
          .select("name")
          .eq("tenant_id", tu.tenant_id);

        return {
          userId: tu.user_id,
          email: authUser?.email || "unknown",
          role: tu.role,
          status: tu.status || "active",
          tenantId: tu.tenant_id,
          schools: schools?.map((s) => s.name) || [],
          createdAt: tu.created_at,
          lastSignIn: authUser?.last_sign_in_at || null,
        };
      })
    );

    return new Response(JSON.stringify(mentees), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
