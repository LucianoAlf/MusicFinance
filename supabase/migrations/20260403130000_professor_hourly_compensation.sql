ALTER TABLE public.professors
  ADD COLUMN IF NOT EXISTS compensation_type text NOT NULL DEFAULT 'per_student',
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lesson_duration_minutes integer NOT NULL DEFAULT 60;

ALTER TABLE public.professors
  DROP CONSTRAINT IF EXISTS professors_compensation_type_check;

ALTER TABLE public.professors
  ADD CONSTRAINT professors_compensation_type_check
  CHECK (compensation_type IN ('per_student', 'hourly'));

ALTER TABLE public.professors
  DROP CONSTRAINT IF EXISTS professors_lesson_duration_minutes_check;

ALTER TABLE public.professors
  ADD CONSTRAINT professors_lesson_duration_minutes_check
  CHECK (lesson_duration_minutes > 0);

ALTER TABLE public.professors
  DROP CONSTRAINT IF EXISTS professors_hourly_rate_check;

ALTER TABLE public.professors
  ADD CONSTRAINT professors_hourly_rate_check
  CHECK (hourly_rate >= 0);

CREATE TABLE IF NOT EXISTS public.professor_monthly_payroll_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  override_amount numeric(10,2) NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT professor_monthly_payroll_overrides_month_check CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT professor_monthly_payroll_overrides_override_amount_check CHECK (override_amount >= 0),
  CONSTRAINT professor_monthly_payroll_overrides_professor_year_month_key UNIQUE (professor_id, year, month)
);

ALTER TABLE public.professor_monthly_payroll_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS professor_payroll_overrides_tenant_isolation ON public.professor_monthly_payroll_overrides;

CREATE POLICY professor_payroll_overrides_tenant_isolation
ON public.professor_monthly_payroll_overrides
USING (
  professor_id IN (
    SELECT p.id
    FROM public.professors p
    JOIN public.schools s ON s.id = p.school_id
    JOIN public.tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE tu.user_id = (SELECT auth.uid())
  )
);

GRANT ALL ON TABLE public.professor_monthly_payroll_overrides TO anon;
GRANT ALL ON TABLE public.professor_monthly_payroll_overrides TO authenticated;
GRANT ALL ON TABLE public.professor_monthly_payroll_overrides TO service_role;

CREATE INDEX IF NOT EXISTS idx_professor_monthly_payroll_overrides_professor_year_month
  ON public.professor_monthly_payroll_overrides (professor_id, year, month);

CREATE OR REPLACE FUNCTION public.normalize_lesson_day_to_isodow(p_day text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE trim(lower(coalesce(p_day, '')))
    WHEN 'seg' THEN 1
    WHEN 'ter' THEN 2
    WHEN 'qua' THEN 3
    WHEN 'qui' THEN 4
    WHEN 'sex' THEN 5
    WHEN 'sab' THEN 6
    WHEN 'dom' THEN 7
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.count_lesson_occurrences_in_month(
  p_year integer,
  p_month integer,
  p_day text
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  WITH target AS (
    SELECT public.normalize_lesson_day_to_isodow(p_day) AS dow
  ),
  bounds AS (
    SELECT
      make_date(p_year, p_month, 1) AS start_date,
      (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date AS end_date
  )
  SELECT CASE
    WHEN (SELECT dow FROM target) IS NULL THEN 0
    ELSE (
      SELECT count(*)::integer
      FROM bounds b,
      generate_series(b.start_date, b.end_date, interval '1 day') AS gs(day)
      WHERE extract(isodow FROM gs.day) = (SELECT dow FROM target)
    )
  END
$$;

CREATE OR REPLACE VIEW public.view_professor_monthly_payroll AS
WITH professor_months AS (
  SELECT
    p.id AS professor_id,
    p.school_id,
    s.year,
    gs.month,
    p.compensation_type,
    p.cost_per_student,
    p.hourly_rate,
    p.lesson_duration_minutes
  FROM public.professors p
  JOIN public.schools s ON s.id = p.school_id
  CROSS JOIN generate_series(1, 12) AS gs(month)
  WHERE p.active = true
),
base AS (
  SELECT
    pm.professor_id,
    pm.school_id,
    pm.year,
    pm.month,
    pm.compensation_type,
    pm.cost_per_student,
    pm.hourly_rate,
    pm.lesson_duration_minutes,
    count(*) FILTER (WHERE st.situation = 'Ativo')::integer AS active_students,
    coalesce(sum(
      CASE
        WHEN st.situation = 'Ativo'
          THEN public.count_lesson_occurrences_in_month(pm.year, pm.month, st.lesson_day)
        ELSE 0
      END
    ), 0)::integer AS lesson_count
  FROM professor_months pm
  LEFT JOIN public.students st
    ON st.professor_id = pm.professor_id
  GROUP BY
    pm.professor_id,
    pm.school_id,
    pm.year,
    pm.month,
    pm.compensation_type,
    pm.cost_per_student,
    pm.hourly_rate,
    pm.lesson_duration_minutes
),
auto_calc AS (
  SELECT
    b.professor_id,
    b.school_id,
    b.year,
    b.month,
    b.compensation_type,
    b.cost_per_student,
    b.hourly_rate,
    b.lesson_duration_minutes,
    b.active_students,
    b.lesson_count,
    CASE
      WHEN b.compensation_type = 'hourly' THEN round(
        (b.lesson_count::numeric * b.lesson_duration_minutes::numeric / 60::numeric) * b.hourly_rate,
        2
      )
      ELSE round(b.active_students::numeric * b.cost_per_student, 2)
    END AS auto_amount
  FROM base b
)
SELECT
  ac.professor_id,
  ac.school_id,
  ac.year,
  ac.month,
  ac.compensation_type,
  ac.cost_per_student,
  ac.hourly_rate,
  ac.lesson_duration_minutes,
  ac.active_students,
  ac.lesson_count,
  ac.auto_amount,
  o.override_amount,
  o.notes,
  CASE
    WHEN o.override_amount IS NOT NULL THEN round(o.override_amount, 2)
    ELSE ac.auto_amount
  END AS professor_payroll,
  CASE
    WHEN o.override_amount IS NOT NULL THEN 'override'
    ELSE 'auto'
  END AS payroll_source
FROM auto_calc ac
LEFT JOIN public.professor_monthly_payroll_overrides o
  ON o.professor_id = ac.professor_id
 AND o.year = ac.year
 AND o.month = ac.month;

ALTER VIEW public.view_professor_monthly_payroll OWNER TO postgres;

GRANT ALL ON TABLE public.view_professor_monthly_payroll TO anon;
GRANT ALL ON TABLE public.view_professor_monthly_payroll TO authenticated;
GRANT ALL ON TABLE public.view_professor_monthly_payroll TO service_role;

CREATE OR REPLACE VIEW public.view_monthly_payroll AS
SELECT
  school_id,
  year,
  month,
  sum(professor_payroll) AS professor_payroll
FROM public.view_professor_monthly_payroll
GROUP BY school_id, year, month;

ALTER VIEW public.view_monthly_payroll OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.get_school_dashboard(p_school_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'school', (
            SELECT row_to_json(s) FROM (
                SELECT id, name, year, default_tuition, passport_fee
                FROM schools WHERE id = p_school_id
            ) s
        ),
        'professors', COALESCE((
            SELECT json_agg(row_to_json(p) ORDER BY p.name) FROM (
                SELECT
                  id,
                  name,
                  instrument,
                  cost_per_student,
                  compensation_type,
                  hourly_rate,
                  lesson_duration_minutes,
                  avatar_url
                FROM professors
                WHERE school_id = p_school_id AND active = true
                ORDER BY name
            ) p
        ), '[]'::json),
        'students', COALESCE((
            SELECT json_agg(row_to_json(s) ORDER BY s.name) FROM (
                SELECT id, professor_id, person_id, name, situation, lesson_day, lesson_time,
                       tuition_amount, enrollment_date, exit_date, instrument_id,
                       phone, responsible_name, responsible_phone, due_day, payment_method
                FROM students WHERE school_id = p_school_id
                ORDER BY name
            ) s
        ), '[]'::json),
        'payments', COALESCE((
            SELECT json_agg(row_to_json(p)) FROM (
                SELECT id, student_id, year, month, amount, status
                FROM payments WHERE school_id = p_school_id
            ) p
        ), '[]'::json),
        'cost_centers', COALESCE((
            SELECT json_agg(row_to_json(c) ORDER BY c.sort_order) FROM (
                SELECT id, name, color, sort_order
                FROM cost_centers WHERE school_id = p_school_id
                ORDER BY sort_order
            ) c
        ), '[]'::json),
        'expense_items', COALESCE((
            SELECT json_agg(row_to_json(e)) FROM (
                SELECT ei.id, ei.cost_center_id, ei.name, ei.expense_type
                FROM expense_items ei
                JOIN cost_centers cc ON cc.id = ei.cost_center_id
                WHERE cc.school_id = p_school_id
            ) e
        ), '[]'::json),
        'expenses', COALESCE((
            SELECT json_agg(row_to_json(e)) FROM (
                SELECT id, expense_item_id, year, month, amount
                FROM expenses WHERE school_id = p_school_id
            ) e
        ), '[]'::json),
        'revenue_categories', COALESCE((
            SELECT json_agg(row_to_json(r) ORDER BY r.sort_order) FROM (
                SELECT id, name, slug, sort_order
                FROM revenue_categories WHERE school_id = p_school_id
                ORDER BY sort_order
            ) r
        ), '[]'::json),
        'revenues', COALESCE((
            SELECT json_agg(row_to_json(r)) FROM (
                SELECT id, category_id, year, month, amount
                FROM revenues WHERE school_id = p_school_id
            ) r
        ), '[]'::json),
        'bills', COALESCE((
            SELECT json_agg(row_to_json(b) ORDER BY b.due_date) FROM (
                SELECT id, expense_item_id, description, bill_type, amount, paid_amount,
                       due_date, paid_at, total_installments, current_installment,
                       status, group_id, competence_month, competence_year
                FROM bills WHERE school_id = p_school_id
                ORDER BY due_date
            ) b
        ), '[]'::json),
        'instruments', COALESCE((
            SELECT json_agg(row_to_json(i) ORDER BY i.name) FROM (
                SELECT id, name
                FROM instruments WHERE school_id = p_school_id
                ORDER BY name
            ) i
        ), '[]'::json),
        'professor_instruments', COALESCE((
            SELECT json_agg(row_to_json(pi)) FROM (
                SELECT pi.professor_id, pi.instrument_id, i.name as instrument_name
                FROM professor_instruments pi
                JOIN instruments i ON i.id = pi.instrument_id
                WHERE pi.professor_id IN (
                    SELECT id FROM professors WHERE school_id = p_school_id AND active = true
                )
            ) pi
        ), '[]'::json),
        'professor_monthly_payroll', COALESCE((
            SELECT json_agg(row_to_json(pp) ORDER BY pp.professor_id, pp.month) FROM (
                SELECT
                  professor_id,
                  school_id,
                  year,
                  month,
                  compensation_type,
                  cost_per_student,
                  hourly_rate,
                  lesson_duration_minutes,
                  active_students,
                  lesson_count,
                  auto_amount,
                  override_amount,
                  notes,
                  professor_payroll,
                  payroll_source
                FROM view_professor_monthly_payroll
                WHERE school_id = p_school_id
                  AND year = (SELECT year FROM schools WHERE id = p_school_id)
            ) pp
        ), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;

ALTER FUNCTION public.get_school_dashboard(uuid) SET search_path = public;
