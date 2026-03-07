// Script para recriar RPCs como SECURITY DEFINER com validação interna
const SUPABASE_URL = "https://bbplmivormqcoiltteox.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJicGxtaXZvcm1xY29pbHR0ZW94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1ODE5MCwiZXhwIjoyMDg4MTM0MTkwfQ.eDv2Pb2BpUZXbVVrlxvszOJSxCKwf-QGha_Uoa7ZQBQ";
const PROJECT_ID = "bbplmivormqcoiltteox";
const ACCESS_TOKEN = "sbp_13c087baf11a4ba0143c8f0437d1140df7b02024";

const sql = `
-- Recriar get_school_dashboard como SECURITY DEFINER com validação interna
CREATE OR REPLACE FUNCTION get_school_dashboard(p_school_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    result JSON;
    v_tenant_id UUID;
BEGIN
    -- Validar acesso: buscar tenant da escola
    SELECT tenant_id INTO v_tenant_id FROM schools WHERE id = p_school_id;
    IF v_tenant_id IS NULL THEN RETURN NULL; END IF;

    -- Verificar se o usuário pertence ao tenant ou é superadmin
    IF NOT EXISTS (
        SELECT 1 FROM tenant_users WHERE tenant_id = v_tenant_id AND user_id = auth.uid()
    ) AND NOT EXISTS (
        SELECT 1 FROM superadmins WHERE user_id = auth.uid()
    ) THEN
        RETURN NULL;
    END IF;

    SELECT json_build_object(
        'school', (
            SELECT row_to_json(s) FROM (
                SELECT id, name, year, default_tuition, passport_fee
                FROM schools WHERE id = p_school_id
            ) s
        ),
        'professors', COALESCE((
            SELECT json_agg(row_to_json(p) ORDER BY p.name) FROM (
                SELECT id, name, instrument, cost_per_student, avatar_url
                FROM professors WHERE school_id = p_school_id AND active = true
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
        ), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$fn$;

-- Recriar get_school_kpis como SECURITY DEFINER com validação interna
CREATE OR REPLACE FUNCTION get_school_kpis(p_school_id UUID, p_year INT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn2$
DECLARE
    result JSON;
    v_tenant_id UUID;
BEGIN
    -- Validar acesso
    SELECT tenant_id INTO v_tenant_id FROM schools WHERE id = p_school_id;
    IF v_tenant_id IS NULL THEN RETURN NULL; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM tenant_users WHERE tenant_id = v_tenant_id AND user_id = auth.uid()
    ) AND NOT EXISTS (
        SELECT 1 FROM superadmins WHERE user_id = auth.uid()
    ) THEN
        RETURN NULL;
    END IF;

    SELECT json_build_object(
        'monthly_kpis', COALESCE((
            SELECT json_agg(row_to_json(k)) FROM (
                SELECT * FROM view_monthly_kpis
                WHERE school_id = p_school_id AND year = p_year
            ) k
        ), '[]'::json),
        'breakeven', COALESCE((
            SELECT json_agg(row_to_json(b)) FROM (
                SELECT * FROM view_breakeven
                WHERE school_id = p_school_id AND year = p_year
            ) b
        ), '[]'::json),
        'avg_tenure', (
            SELECT row_to_json(t) FROM (
                SELECT * FROM view_avg_tenure
                WHERE school_id = p_school_id
            ) t
        )
    ) INTO result;

    RETURN result;
END;
$fn2$;

-- Conceder permissão de execução
GRANT EXECUTE ON FUNCTION get_school_dashboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_school_kpis(UUID, INT) TO authenticated;
`;

async function run() {
  console.log("Executando SQL via Management API...");
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text.substring(0, 500));
}

run().catch(console.error);
