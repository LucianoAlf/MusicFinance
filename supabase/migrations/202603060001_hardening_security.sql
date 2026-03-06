-- Hardening: remover SECURITY DEFINER de views analiticas
-- e reduzir superficie de acesso do role anon.

ALTER VIEW public.view_monthly_kpis SET (security_invoker = true);
ALTER VIEW public.view_monthly_churn SET (security_invoker = true);
ALTER VIEW public.view_breakeven SET (security_invoker = true);
ALTER VIEW public.view_monthly_revenue SET (security_invoker = true);
ALTER VIEW public.view_active_students SET (security_invoker = true);
ALTER VIEW public.view_avg_tenure SET (security_invoker = true);
ALTER VIEW public.view_monthly_payroll SET (security_invoker = true);
ALTER VIEW public.view_new_enrollments SET (security_invoker = true);

-- Revoga permissoes amplas para usuarios nao autenticados.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;
