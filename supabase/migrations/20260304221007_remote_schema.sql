


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_expense_school_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.school_id != (
        SELECT cc.school_id 
        FROM expense_items ei 
        JOIN cost_centers cc ON cc.id = ei.cost_center_id
        WHERE ei.id = NEW.expense_item_id
    ) THEN
        RAISE EXCEPTION 'school_id da expense nao confere com o cost_center';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_expense_school_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_payment_school_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.school_id != (
        SELECT s.school_id FROM students s WHERE s.id = NEW.student_id
    ) THEN
        RAISE EXCEPTION 'school_id do payment nao confere com o do student';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_payment_school_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_tenant_for_user"("p_name" "text", "p_email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    INSERT INTO tenants (name, email)
    VALUES (p_name, p_email)
    RETURNING id INTO v_tenant_id;

    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (v_tenant_id, auth.uid(), 'owner');

    RETURN v_tenant_id;
END;
$$;


ALTER FUNCTION "public"."create_tenant_for_user"("p_name" "text", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_student_history"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
    BEGIN
        IF OLD.situation IS DISTINCT FROM NEW.situation THEN
            INSERT INTO student_history (student_id, previous_situation, new_situation, reason)
            VALUES (NEW.id, OLD.situation, NEW.situation, NULL);
        END IF;

        IF NEW.situation IN ('Evadido', 'Trancado') AND NEW.exit_date IS NULL THEN
            NEW.exit_date := CURRENT_DATE;
        END IF;

        IF NEW.situation = 'Ativo' AND OLD.situation != 'Ativo' THEN
            NEW.exit_date := NULL;
        END IF;

        RETURN NEW;
    END;
    $$;


ALTER FUNCTION "public"."log_student_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_school_data"("p_school_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verify caller belongs to the tenant that owns this school
  IF NOT EXISTS (
    SELECT 1 FROM schools s
    JOIN tenant_users tu ON tu.tenant_id = s.tenant_id
    WHERE s.id = p_school_id AND tu.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: school not in your tenant';
  END IF;

  DELETE FROM bills WHERE school_id = p_school_id;
  DELETE FROM revenues WHERE school_id = p_school_id;
  DELETE FROM expenses WHERE school_id = p_school_id;
  DELETE FROM expense_items WHERE cost_center_id IN (
    SELECT id FROM cost_centers WHERE school_id = p_school_id
  );
  DELETE FROM cost_centers WHERE school_id = p_school_id;
  DELETE FROM payments WHERE school_id = p_school_id;
  DELETE FROM student_history WHERE student_id IN (
    SELECT id FROM students WHERE school_id = p_school_id
  );
  DELETE FROM professor_instruments WHERE professor_id IN (
    SELECT id FROM professors WHERE school_id = p_school_id
  );
  DELETE FROM students WHERE school_id = p_school_id;
  DELETE FROM professors WHERE school_id = p_school_id;
  DELETE FROM instruments WHERE school_id = p_school_id;
  DELETE FROM revenue_categories WHERE school_id = p_school_id;

  INSERT INTO cost_centers (school_id, name, color, sort_order) VALUES
    (p_school_id, 'Pessoal', '#6366f1', 0),
    (p_school_id, 'Professores', '#8b5cf6', 1),
    (p_school_id, 'Marketing', '#f59e0b', 2),
    (p_school_id, 'Eventos', '#10b981', 3),
    (p_school_id, 'Admin', '#3b82f6', 4),
    (p_school_id, 'Invest', '#ef4444', 5),
    (p_school_id, 'Impostos', '#6b7280', 6);

  INSERT INTO revenue_categories (school_id, name, slug, sort_order) VALUES
    (p_school_id, 'Matriculas', 'enrollments', 0),
    (p_school_id, 'Loja', 'shop', 1),
    (p_school_id, 'Eventos', 'events', 2),
    (p_school_id, 'Rendimentos', 'interest', 3),
    (p_school_id, 'Outros', 'other', 4);

  INSERT INTO instruments (school_id, name) VALUES
    (p_school_id, 'Piano'),
    (p_school_id, 'Violao'),
    (p_school_id, 'Guitarra'),
    (p_school_id, 'Bateria'),
    (p_school_id, 'Canto'),
    (p_school_id, 'Baixo'),
    (p_school_id, 'Teclado'),
    (p_school_id, 'Violino'),
    (p_school_id, 'Saxofone'),
    (p_school_id, 'Flauta');
END;
$$;


ALTER FUNCTION "public"."reset_school_data"("p_school_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_school_defaults"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    BEGIN
      INSERT INTO cost_centers (school_id, name, color, sort_order) VALUES
        (NEW.id, 'Pessoal', '#6366f1', 0),
        (NEW.id, 'Professores', '#8b5cf6', 1),
        (NEW.id, 'Marketing', '#f59e0b', 2),
        (NEW.id, 'Eventos', '#10b981', 3),
        (NEW.id, 'Admin', '#3b82f6', 4),
        (NEW.id, 'Invest', '#ef4444', 5),
        (NEW.id, 'Impostos', '#6b7280', 6);

      INSERT INTO revenue_categories (school_id, name, slug, sort_order) VALUES
        (NEW.id, 'Matriculas', 'enrollments', 0),
        (NEW.id, 'Loja', 'shop', 1),
        (NEW.id, 'Eventos', 'events', 2),
        (NEW.id, 'Rendimentos', 'interest', 3),
        (NEW.id, 'Outros', 'other', 4);

      INSERT INTO instruments (school_id, name) VALUES
        (NEW.id, 'Piano'),
        (NEW.id, 'Violao'),
        (NEW.id, 'Guitarra'),
        (NEW.id, 'Bateria'),
        (NEW.id, 'Canto'),
        (NEW.id, 'Baixo'),
        (NEW.id, 'Teclado'),
        (NEW.id, 'Violino'),
        (NEW.id, 'Saxofone'),
        (NEW.id, 'Flauta');

      RETURN NEW;
    END;
    $$;


ALTER FUNCTION "public"."seed_school_defaults"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid",
    "expense_item_id" "uuid",
    "description" "text" NOT NULL,
    "bill_type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "paid_amount" numeric(10,2),
    "due_date" "date" NOT NULL,
    "paid_at" "date",
    "total_installments" integer,
    "current_installment" integer,
    "status" "text" DEFAULT 'PENDING'::"text",
    "group_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "competence_month" integer,
    "competence_year" integer,
    CONSTRAINT "bills_bill_type_check" CHECK (("bill_type" = ANY (ARRAY['UNIQUE'::"text", 'RECURRENT_FIXED'::"text", 'RECURRENT_VARIABLE'::"text", 'INSTALLMENT'::"text"]))),
    CONSTRAINT "bills_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'PAID'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."bills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cost_centers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid",
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#6b7280'::"text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cost_centers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cost_center_id" "uuid",
    "name" "text" NOT NULL,
    "expense_type" "text" DEFAULT 'V'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "expense_items_expense_type_check" CHECK (("expense_type" = ANY (ARRAY['F'::"text", 'V'::"text"])))
);


ALTER TABLE "public"."expense_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_item_id" "uuid",
    "school_id" "uuid",
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "amount" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "expenses_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."import_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "professors_created" integer DEFAULT 0,
    "students_created" integer DEFAULT 0,
    "students_churned" integer DEFAULT 0,
    "payments_confirmed" integer DEFAULT 0,
    "tuition_changes" integer DEFAULT 0,
    "transfers" integer DEFAULT 0,
    "file_name" "text",
    "imported_at" timestamp with time zone DEFAULT "now"(),
    "imported_by" "uuid",
    CONSTRAINT "import_history_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."import_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instruments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."instruments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid",
    "school_id" "uuid",
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "amount" numeric(10,2),
    "paid_at" timestamp with time zone,
    "status" "text" DEFAULT 'PENDING'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payments_month_check" CHECK ((("month" >= 1) AND ("month" <= 12))),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'PAID'::"text", 'LATE'::"text", 'WAIVED'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professor_instruments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "professor_id" "uuid" NOT NULL,
    "instrument_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."professor_instruments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid",
    "name" "text" NOT NULL,
    "instrument" "text",
    "cost_per_student" numeric(10,2) DEFAULT 0,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text"
);


ALTER TABLE "public"."professors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."revenue_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."revenue_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."revenues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid",
    "category_id" "uuid",
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "amount" numeric(10,2) DEFAULT 0,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "revenues_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."revenues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "name" "text" NOT NULL,
    "year" integer DEFAULT EXTRACT(year FROM "now"()) NOT NULL,
    "default_tuition" numeric(10,2) DEFAULT 350,
    "passport_fee" numeric(10,2) DEFAULT 350,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid",
    "previous_situation" "text",
    "new_situation" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "reason" "text"
);


ALTER TABLE "public"."student_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid",
    "professor_id" "uuid",
    "name" "text" NOT NULL,
    "situation" "text" DEFAULT 'Ativo'::"text",
    "enrollment_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "exit_date" "date",
    "lesson_day" "text",
    "lesson_time" "text",
    "tuition_amount" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "instrument_id" "uuid",
    "person_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text",
    "responsible_name" "text",
    "responsible_phone" "text",
    "due_day" integer DEFAULT 5,
    CONSTRAINT "students_situation_check" CHECK (("situation" = ANY (ARRAY['Ativo'::"text", 'Evadido'::"text", 'Trancado'::"text"])))
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."superadmins" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."superadmins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'owner'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tenant_users_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."tenant_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_active_students" AS
 SELECT "school_id",
    "count"(DISTINCT "person_id") FILTER (WHERE ("situation" = 'Ativo'::"text")) AS "active_students",
    "count"(DISTINCT "person_id") AS "total_students"
   FROM "public"."students"
  GROUP BY "school_id";


ALTER VIEW "public"."view_active_students" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_avg_tenure" AS
 SELECT "school_id",
    "round"(("avg"(
        CASE
            WHEN "has_active" THEN ((CURRENT_DATE - "first_enrollment"))::numeric
            ELSE (("last_exit" - "first_enrollment"))::numeric
        END) / 30.0), 1) AS "avg_tenure_months"
   FROM ( SELECT "students"."school_id",
            "students"."person_id",
            "min"("students"."enrollment_date") AS "first_enrollment",
            "max"("students"."exit_date") AS "last_exit",
            "bool_or"(("students"."situation" = 'Ativo'::"text")) AS "has_active"
           FROM "public"."students"
          GROUP BY "students"."school_id", "students"."person_id") "sub"
  GROUP BY "school_id";


ALTER VIEW "public"."view_avg_tenure" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_monthly_payroll" AS
 SELECT "pay"."school_id",
    "pay"."year",
    "pay"."month",
    "sum"("pr"."cost_per_student") AS "professor_payroll"
   FROM (("public"."payments" "pay"
     JOIN "public"."students" "s" ON (("s"."id" = "pay"."student_id")))
     JOIN "public"."professors" "pr" ON (("pr"."id" = "s"."professor_id")))
  WHERE ("pay"."status" = 'PAID'::"text")
  GROUP BY "pay"."school_id", "pay"."year", "pay"."month";


ALTER VIEW "public"."view_monthly_payroll" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_monthly_revenue" AS
 SELECT "p"."school_id",
    "p"."year",
    "p"."month",
    COALESCE("sum"("p"."amount") FILTER (WHERE (("p"."status" = 'PAID'::"text") AND ("p"."amount" > (0)::numeric))), (0)::numeric) AS "tuition_revenue",
    "count"(DISTINCT "s"."person_id") FILTER (WHERE (("p"."status" = 'PAID'::"text") AND ("p"."amount" > (0)::numeric))) AS "paying_students"
   FROM ("public"."payments" "p"
     JOIN "public"."students" "s" ON (("s"."id" = "p"."student_id")))
  GROUP BY "p"."school_id", "p"."year", "p"."month";


ALTER VIEW "public"."view_monthly_revenue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_breakeven" AS
 SELECT "e"."school_id",
    "e"."year",
    "e"."month",
    (COALESCE("sum"("e"."amount") FILTER (WHERE ("ei"."expense_type" = 'F'::"text")), (0)::numeric) + COALESCE("pp"."professor_payroll", (0)::numeric)) AS "fixed_costs",
    COALESCE("sum"("e"."amount") FILTER (WHERE ("ei"."expense_type" = 'V'::"text")), (0)::numeric) AS "variable_costs",
    COALESCE("r"."tuition_revenue", (0)::numeric) AS "revenue",
        CASE
            WHEN ((COALESCE("r"."tuition_revenue", (0)::numeric) > (0)::numeric) AND (((1)::numeric - (COALESCE("sum"("e"."amount") FILTER (WHERE ("ei"."expense_type" = 'V'::"text")), (0)::numeric) / NULLIF("r"."tuition_revenue", (0)::numeric))) > (0)::numeric)) THEN "round"(((COALESCE("sum"("e"."amount") FILTER (WHERE ("ei"."expense_type" = 'F'::"text")), (0)::numeric) + COALESCE("pp"."professor_payroll", (0)::numeric)) / ((1)::numeric - (COALESCE("sum"("e"."amount") FILTER (WHERE ("ei"."expense_type" = 'V'::"text")), (0)::numeric) / "r"."tuition_revenue"))), 2)
            ELSE NULL::numeric
        END AS "breakeven_revenue"
   FROM ((("public"."expenses" "e"
     JOIN "public"."expense_items" "ei" ON (("ei"."id" = "e"."expense_item_id")))
     LEFT JOIN "public"."view_monthly_revenue" "r" ON ((("r"."school_id" = "e"."school_id") AND ("r"."year" = "e"."year") AND ("r"."month" = "e"."month"))))
     LEFT JOIN "public"."view_monthly_payroll" "pp" ON ((("pp"."school_id" = "e"."school_id") AND ("pp"."year" = "e"."year") AND ("pp"."month" = "e"."month"))))
  GROUP BY "e"."school_id", "e"."year", "e"."month", "r"."tuition_revenue", "pp"."professor_payroll";


ALTER VIEW "public"."view_breakeven" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_monthly_churn" AS
 SELECT "s"."school_id",
    (EXTRACT(year FROM "sh"."changed_at"))::integer AS "year",
    (EXTRACT(month FROM "sh"."changed_at"))::integer AS "month",
    "count"(DISTINCT "s"."person_id") AS "churned_students"
   FROM ("public"."student_history" "sh"
     JOIN "public"."students" "s" ON (("s"."id" = "sh"."student_id")))
  WHERE ("sh"."new_situation" = 'Evadido'::"text")
  GROUP BY "s"."school_id", (EXTRACT(year FROM "sh"."changed_at")), (EXTRACT(month FROM "sh"."changed_at"));


ALTER VIEW "public"."view_monthly_churn" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_new_enrollments" AS
 SELECT "school_id",
    (EXTRACT(year FROM "enrollment_date"))::integer AS "year",
    (EXTRACT(month FROM "enrollment_date"))::integer AS "month",
    "count"(*) AS "new_enrollments"
   FROM "public"."students" "s"
  GROUP BY "school_id", (EXTRACT(year FROM "enrollment_date")), (EXTRACT(month FROM "enrollment_date"));


ALTER VIEW "public"."view_new_enrollments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_monthly_kpis" AS
 SELECT COALESCE("r"."school_id", "ne"."school_id", "c"."school_id", "pp"."school_id") AS "school_id",
    COALESCE("r"."year", "ne"."year", "c"."year", "pp"."year") AS "year",
    COALESCE("r"."month", "ne"."month", "c"."month", "pp"."month") AS "month",
    COALESCE("r"."tuition_revenue", (0)::numeric) AS "tuition_revenue",
    COALESCE("r"."paying_students", (0)::bigint) AS "paying_students",
    COALESCE("a"."active_students", (0)::bigint) AS "active_students",
    COALESCE("ne"."new_enrollments", (0)::bigint) AS "new_enrollments",
    COALESCE("c"."churned_students", (0)::bigint) AS "churned_students",
    COALESCE("pp"."professor_payroll", (0)::numeric) AS "professor_payroll",
        CASE
            WHEN (COALESCE("a"."active_students", (0)::bigint) > 0) THEN "round"((((COALESCE("c"."churned_students", (0)::bigint))::numeric / ("a"."active_students")::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "churn_rate"
   FROM (((("public"."view_monthly_revenue" "r"
     FULL JOIN "public"."view_new_enrollments" "ne" ON ((("r"."school_id" = "ne"."school_id") AND ("r"."year" = "ne"."year") AND ("r"."month" = "ne"."month"))))
     FULL JOIN "public"."view_monthly_churn" "c" ON (((COALESCE("r"."school_id", "ne"."school_id") = "c"."school_id") AND (COALESCE("r"."year", "ne"."year") = "c"."year") AND (COALESCE("r"."month", "ne"."month") = "c"."month"))))
     FULL JOIN "public"."view_monthly_payroll" "pp" ON (((COALESCE("r"."school_id", "ne"."school_id", "c"."school_id") = "pp"."school_id") AND (COALESCE("r"."year", "ne"."year", "c"."year") = "pp"."year") AND (COALESCE("r"."month", "ne"."month", "c"."month") = "pp"."month"))))
     LEFT JOIN "public"."view_active_students" "a" ON (("a"."school_id" = COALESCE("r"."school_id", "ne"."school_id", "c"."school_id", "pp"."school_id"))));


ALTER VIEW "public"."view_monthly_kpis" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_items"
    ADD CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_expense_item_id_year_month_key" UNIQUE ("expense_item_id", "year", "month");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."import_history"
    ADD CONSTRAINT "import_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."import_history"
    ADD CONSTRAINT "import_history_school_id_year_month_key" UNIQUE ("school_id", "year", "month");



ALTER TABLE ONLY "public"."instruments"
    ADD CONSTRAINT "instruments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instruments"
    ADD CONSTRAINT "instruments_school_id_name_key" UNIQUE ("school_id", "name");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_student_id_year_month_key" UNIQUE ("student_id", "year", "month");



ALTER TABLE ONLY "public"."professor_instruments"
    ADD CONSTRAINT "professor_instruments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professor_instruments"
    ADD CONSTRAINT "professor_instruments_professor_id_instrument_id_key" UNIQUE ("professor_id", "instrument_id");



ALTER TABLE ONLY "public"."professors"
    ADD CONSTRAINT "professors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revenue_categories"
    ADD CONSTRAINT "revenue_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revenue_categories"
    ADD CONSTRAINT "revenue_categories_school_id_slug_key" UNIQUE ("school_id", "slug");



ALTER TABLE ONLY "public"."revenues"
    ADD CONSTRAINT "revenues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revenues"
    ADD CONSTRAINT "revenues_school_id_category_id_year_month_key" UNIQUE ("school_id", "category_id", "year", "month");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_history"
    ADD CONSTRAINT "student_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."superadmins"
    ADD CONSTRAINT "superadmins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_tenant_id_user_id_key" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_bills_due_date" ON "public"."bills" USING "btree" ("due_date");



CREATE INDEX "idx_bills_group" ON "public"."bills" USING "btree" ("group_id");



CREATE INDEX "idx_bills_school" ON "public"."bills" USING "btree" ("school_id");



CREATE INDEX "idx_bills_status" ON "public"."bills" USING "btree" ("status");



CREATE INDEX "idx_cost_centers_school" ON "public"."cost_centers" USING "btree" ("school_id");



CREATE INDEX "idx_expense_items_cc" ON "public"."expense_items" USING "btree" ("cost_center_id");



CREATE INDEX "idx_expenses_item" ON "public"."expenses" USING "btree" ("expense_item_id");



CREATE INDEX "idx_expenses_school_year_month" ON "public"."expenses" USING "btree" ("school_id", "year", "month");



CREATE INDEX "idx_payments_school_year_month" ON "public"."payments" USING "btree" ("school_id", "year", "month");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_payments_student" ON "public"."payments" USING "btree" ("student_id");



CREATE INDEX "idx_revenue_categories_school" ON "public"."revenue_categories" USING "btree" ("school_id");



CREATE INDEX "idx_revenues_school_year_month" ON "public"."revenues" USING "btree" ("school_id", "year", "month");



CREATE INDEX "idx_student_history_changed" ON "public"."student_history" USING "btree" ("changed_at");



CREATE INDEX "idx_student_history_student" ON "public"."student_history" USING "btree" ("student_id");



CREATE INDEX "idx_students_enrollment" ON "public"."students" USING "btree" ("enrollment_date");



CREATE INDEX "idx_students_professor" ON "public"."students" USING "btree" ("professor_id");



CREATE INDEX "idx_students_school" ON "public"."students" USING "btree" ("school_id");



CREATE INDEX "idx_students_situation" ON "public"."students" USING "btree" ("situation");



CREATE OR REPLACE TRIGGER "on_school_created" AFTER INSERT ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."seed_school_defaults"();



CREATE OR REPLACE TRIGGER "on_student_status_change" BEFORE UPDATE OF "situation" ON "public"."students" FOR EACH ROW WHEN (("old"."situation" IS DISTINCT FROM "new"."situation")) EXECUTE FUNCTION "public"."log_student_history"();



CREATE OR REPLACE TRIGGER "trg_expense_school_check" BEFORE INSERT OR UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."check_expense_school_consistency"();



CREATE OR REPLACE TRIGGER "trg_payment_school_check" BEFORE INSERT OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."check_payment_school_consistency"();



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_expense_item_id_fkey" FOREIGN KEY ("expense_item_id") REFERENCES "public"."expense_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_items"
    ADD CONSTRAINT "expense_items_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_expense_item_id_fkey" FOREIGN KEY ("expense_item_id") REFERENCES "public"."expense_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."import_history"
    ADD CONSTRAINT "import_history_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."import_history"
    ADD CONSTRAINT "import_history_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instruments"
    ADD CONSTRAINT "instruments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professor_instruments"
    ADD CONSTRAINT "professor_instruments_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professor_instruments"
    ADD CONSTRAINT "professor_instruments_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "public"."professors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professors"
    ADD CONSTRAINT "professors_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revenue_categories"
    ADD CONSTRAINT "revenue_categories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revenues"
    ADD CONSTRAINT "revenues_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."revenue_categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."revenues"
    ADD CONSTRAINT "revenues_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_history"
    ADD CONSTRAINT "student_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "public"."professors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."superadmins"
    ADD CONSTRAINT "superadmins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_centers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."import_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "import_history_tenant_isolation" ON "public"."import_history" USING (("school_id" IN ( SELECT "s"."id"
   FROM ("public"."schools" "s"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."instruments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "instruments_tenant_isolation" ON "public"."instruments" USING (("school_id" IN ( SELECT "s"."id"
   FROM ("public"."schools" "s"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prof_instruments_tenant_isolation" ON "public"."professor_instruments" USING (("professor_id" IN ( SELECT "p"."id"
   FROM (("public"."professors" "p"
     JOIN "public"."schools" "s" ON (("s"."id" = "p"."school_id")))
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."professor_instruments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."professors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revenue_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revenues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "superadmin_manage_invites" ON "public"."invites" USING (("auth"."uid"() IN ( SELECT "superadmins"."user_id"
   FROM "public"."superadmins")));



CREATE POLICY "superadmin_self_read" ON "public"."superadmins" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."superadmins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_isolation" ON "public"."bills" USING (("school_id" IN ( SELECT "s"."id"
   FROM ("public"."schools" "s"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



CREATE POLICY "tenant_isolation" ON "public"."cost_centers" USING (("school_id" IN ( SELECT "s"."id"
   FROM ("public"."schools" "s"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



CREATE POLICY "tenant_isolation" ON "public"."expense_items" USING (("cost_center_id" IN ( SELECT "cc"."id"
   FROM (("public"."cost_centers" "cc"
     JOIN "public"."schools" "s" ON (("s"."id" = "cc"."school_id")))
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



CREATE POLICY "tenant_isolation" ON "public"."expenses" USING (("school_id" IN ( SELECT "s"."id"
   FROM ("public"."schools" "s"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



CREATE POLICY "tenant_isolation" ON "public"."payments" USING (("school_id" IN ( SELECT "s"."id"
   FROM ("public"."schools" "s"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



CREATE POLICY "tenant_isolation" ON "public"."professors" USING (("school_id" IN ( SELECT "s"."id"
   FROM ("public"."schools" "s"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



CREATE POLICY "tenant_isolation" ON "public"."revenue_categories" USING (("school_id" IN ( SELECT "s"."id"
   FROM ("public"."schools" "s"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



CREATE POLICY "tenant_isolation" ON "public"."revenues" USING (("school_id" IN ( SELECT "s"."id"
   FROM ("public"."schools" "s"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



CREATE POLICY "tenant_isolation" ON "public"."schools" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "tenant_isolation" ON "public"."student_history" USING (("student_id" IN ( SELECT "st"."id"
   FROM (("public"."students" "st"
     JOIN "public"."schools" "s" ON (("s"."id" = "st"."school_id")))
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



CREATE POLICY "tenant_isolation" ON "public"."students" USING (("school_id" IN ( SELECT "s"."id"
   FROM ("public"."schools" "s"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "s"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



CREATE POLICY "tenant_isolation" ON "public"."tenant_users" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "tenant_isolation" ON "public"."tenants" USING (("id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."tenant_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_expense_school_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_expense_school_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_expense_school_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_payment_school_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_payment_school_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_payment_school_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_tenant_for_user"("p_name" "text", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_tenant_for_user"("p_name" "text", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tenant_for_user"("p_name" "text", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_student_history"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_student_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_student_history"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_school_data"("p_school_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_school_data"("p_school_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_school_data"("p_school_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_school_defaults"() TO "anon";
GRANT ALL ON FUNCTION "public"."seed_school_defaults"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_school_defaults"() TO "service_role";


















GRANT ALL ON TABLE "public"."bills" TO "anon";
GRANT ALL ON TABLE "public"."bills" TO "authenticated";
GRANT ALL ON TABLE "public"."bills" TO "service_role";



GRANT ALL ON TABLE "public"."cost_centers" TO "anon";
GRANT ALL ON TABLE "public"."cost_centers" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_centers" TO "service_role";



GRANT ALL ON TABLE "public"."expense_items" TO "anon";
GRANT ALL ON TABLE "public"."expense_items" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_items" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."import_history" TO "anon";
GRANT ALL ON TABLE "public"."import_history" TO "authenticated";
GRANT ALL ON TABLE "public"."import_history" TO "service_role";



GRANT ALL ON TABLE "public"."instruments" TO "anon";
GRANT ALL ON TABLE "public"."instruments" TO "authenticated";
GRANT ALL ON TABLE "public"."instruments" TO "service_role";



GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."professor_instruments" TO "anon";
GRANT ALL ON TABLE "public"."professor_instruments" TO "authenticated";
GRANT ALL ON TABLE "public"."professor_instruments" TO "service_role";



GRANT ALL ON TABLE "public"."professors" TO "anon";
GRANT ALL ON TABLE "public"."professors" TO "authenticated";
GRANT ALL ON TABLE "public"."professors" TO "service_role";



GRANT ALL ON TABLE "public"."revenue_categories" TO "anon";
GRANT ALL ON TABLE "public"."revenue_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."revenue_categories" TO "service_role";



GRANT ALL ON TABLE "public"."revenues" TO "anon";
GRANT ALL ON TABLE "public"."revenues" TO "authenticated";
GRANT ALL ON TABLE "public"."revenues" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."student_history" TO "anon";
GRANT ALL ON TABLE "public"."student_history" TO "authenticated";
GRANT ALL ON TABLE "public"."student_history" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."superadmins" TO "anon";
GRANT ALL ON TABLE "public"."superadmins" TO "authenticated";
GRANT ALL ON TABLE "public"."superadmins" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_users" TO "anon";
GRANT ALL ON TABLE "public"."tenant_users" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_users" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."view_active_students" TO "anon";
GRANT ALL ON TABLE "public"."view_active_students" TO "authenticated";
GRANT ALL ON TABLE "public"."view_active_students" TO "service_role";



GRANT ALL ON TABLE "public"."view_avg_tenure" TO "anon";
GRANT ALL ON TABLE "public"."view_avg_tenure" TO "authenticated";
GRANT ALL ON TABLE "public"."view_avg_tenure" TO "service_role";



GRANT ALL ON TABLE "public"."view_monthly_payroll" TO "anon";
GRANT ALL ON TABLE "public"."view_monthly_payroll" TO "authenticated";
GRANT ALL ON TABLE "public"."view_monthly_payroll" TO "service_role";



GRANT ALL ON TABLE "public"."view_monthly_revenue" TO "anon";
GRANT ALL ON TABLE "public"."view_monthly_revenue" TO "authenticated";
GRANT ALL ON TABLE "public"."view_monthly_revenue" TO "service_role";



GRANT ALL ON TABLE "public"."view_breakeven" TO "anon";
GRANT ALL ON TABLE "public"."view_breakeven" TO "authenticated";
GRANT ALL ON TABLE "public"."view_breakeven" TO "service_role";



GRANT ALL ON TABLE "public"."view_monthly_churn" TO "anon";
GRANT ALL ON TABLE "public"."view_monthly_churn" TO "authenticated";
GRANT ALL ON TABLE "public"."view_monthly_churn" TO "service_role";



GRANT ALL ON TABLE "public"."view_new_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."view_new_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."view_new_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."view_monthly_kpis" TO "anon";
GRANT ALL ON TABLE "public"."view_monthly_kpis" TO "authenticated";
GRANT ALL ON TABLE "public"."view_monthly_kpis" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


  create policy "Auth delete professor-avatars"
  on "storage"."objects"
  as permissive
  for delete
  to public
using ((bucket_id = 'professor-avatars'::text));



  create policy "Auth update professor-avatars"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'professor-avatars'::text));



  create policy "Auth upload professor-avatars"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'professor-avatars'::text));



  create policy "Public read professor-avatars"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'professor-avatars'::text));



