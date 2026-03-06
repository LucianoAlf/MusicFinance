-- Hardening v2
-- 1) Corrige functions com search_path mutável
-- 2) Otimiza políticas RLS para evitar reavaliação linha-a-linha de auth.uid()

-- =========================================================
-- Functions: search_path fixo
-- =========================================================
ALTER FUNCTION public.log_student_history() SET search_path = public;
ALTER FUNCTION public.check_expense_school_consistency() SET search_path = public;
ALTER FUNCTION public.check_payment_school_consistency() SET search_path = public;
ALTER FUNCTION public.create_tenant_for_user(text, text) SET search_path = public;
ALTER FUNCTION public.reset_school_data(uuid) SET search_path = public;
ALTER FUNCTION public.seed_school_defaults() SET search_path = public;

-- =========================================================
-- RLS: usar (select auth.uid()) para initplan
-- =========================================================
ALTER POLICY tenant_isolation ON public.tenants
USING (
  id IN (
    SELECT tenant_users.tenant_id
    FROM public.tenant_users
    WHERE tenant_users.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY tenant_isolation ON public.schools
USING (
  tenant_id IN (
    SELECT tenant_users.tenant_id
    FROM public.tenant_users
    WHERE tenant_users.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY tenant_isolation ON public.professors
USING (
  school_id IN (
    SELECT s.id
    FROM public.schools s
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY tenant_isolation ON public.students
USING (
  school_id IN (
    SELECT s.id
    FROM public.schools s
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY tenant_isolation ON public.student_history
USING (
  student_id IN (
    SELECT st.id
    FROM public.students st
    JOIN public.schools s ON s.id = st.school_id
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY tenant_isolation ON public.payments
USING (
  school_id IN (
    SELECT s.id
    FROM public.schools s
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY tenant_isolation ON public.cost_centers
USING (
  school_id IN (
    SELECT s.id
    FROM public.schools s
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY tenant_isolation ON public.expense_items
USING (
  cost_center_id IN (
    SELECT cc.id
    FROM public.cost_centers cc
    JOIN public.schools s ON s.id = cc.school_id
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY tenant_isolation ON public.expenses
USING (
  school_id IN (
    SELECT s.id
    FROM public.schools s
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY tenant_isolation ON public.revenue_categories
USING (
  school_id IN (
    SELECT s.id
    FROM public.schools s
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY tenant_isolation ON public.revenues
USING (
  school_id IN (
    SELECT s.id
    FROM public.schools s
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY tenant_isolation ON public.bills
USING (
  school_id IN (
    SELECT s.id
    FROM public.schools s
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY tenant_isolation ON public.tenant_users
USING (
  user_id = (SELECT auth.uid())
);

ALTER POLICY instruments_tenant_isolation ON public.instruments
USING (
  school_id IN (
    SELECT s.id
    FROM public.schools s
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY prof_instruments_tenant_isolation ON public.professor_instruments
USING (
  professor_id IN (
    SELECT p.id
    FROM public.professors p
    JOIN public.schools s ON s.id = p.school_id
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY import_history_tenant_isolation ON public.import_history
USING (
  school_id IN (
    SELECT s.id
    FROM public.schools s
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY superadmin_self_read ON public.superadmins
USING (
  user_id = (SELECT auth.uid())
);

ALTER POLICY superadmin_manage_invites ON public.invites
USING (
  (SELECT auth.uid()) IN (
    SELECT superadmins.user_id
    FROM public.superadmins
  )
);
