-- Performance hardening: indices para foreign keys sem cobertura
-- apontadas pelo advisor do Supabase.

CREATE INDEX IF NOT EXISTS idx_bills_expense_item_id
  ON public.bills (expense_item_id);

CREATE INDEX IF NOT EXISTS idx_import_history_imported_by
  ON public.import_history (imported_by);

CREATE INDEX IF NOT EXISTS idx_invites_invited_by
  ON public.invites (invited_by);

CREATE INDEX IF NOT EXISTS idx_professor_instruments_instrument_id
  ON public.professor_instruments (instrument_id);

CREATE INDEX IF NOT EXISTS idx_professors_school_id
  ON public.professors (school_id);

CREATE INDEX IF NOT EXISTS idx_revenues_category_id
  ON public.revenues (category_id);

CREATE INDEX IF NOT EXISTS idx_schools_tenant_id
  ON public.schools (tenant_id);

CREATE INDEX IF NOT EXISTS idx_students_instrument_id
  ON public.students (instrument_id);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id
  ON public.tenant_users (user_id);
