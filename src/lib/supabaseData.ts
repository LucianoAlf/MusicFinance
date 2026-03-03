import { supabase } from "./supabase";
import type {
  DashboardData,
  Professor,
  Student,
  CostCenter,
  ExpenseItem,
  Revenue,
  PayableBill,
  Config,
} from "../types";

// ─── Row types from Supabase ───────────────────────────────────────────────
interface DbProfessor { id: string; name: string; instrument: string; cost_per_student: number; }
interface DbStudent { id: string; professor_id: string; name: string; situation: string; lesson_day: string | null; lesson_time: string | null; tuition_amount: number | null; enrollment_date: string | null; exit_date: string | null; }
interface DbPayment { id: string; student_id: string; year: number; month: number; amount: number; status: string; }
interface DbCostCenter { id: string; name: string; color: string; sort_order: number; }
interface DbExpenseItem { id: string; cost_center_id: string; name: string; expense_type: string; }
interface DbExpense { id: string; expense_item_id: string; year: number; month: number; amount: number; }
interface DbRevenueCategory { id: string; name: string; slug: string; sort_order: number; }
interface DbRevenue { id: string; category_id: string; year: number; month: number; amount: number; }
interface DbBill { id: string; expense_item_id: string | null; description: string; bill_type: string; amount: number; paid_amount: number | null; due_date: string; paid_at: string | null; total_installments: number | null; current_installment: number | null; status: string; group_id: string | null; }
interface DbSchool { id: string; name: string; year: number; default_tuition: number; passport_fee: number; }

// ─── Slug map for revenue categories ───────────────────────────────────────
export type SlugMap = Record<string, string>; // slug -> id

// ─── LOAD ──────────────────────────────────────────────────────────────────

export async function loadSchoolData(schoolId: string): Promise<{ data: DashboardData | null; slugMap: SlugMap; error: string | null }> {
  const [
    schoolRes,
    professorsRes,
    studentsRes,
    paymentsRes,
    costCentersRes,
    expenseItemsRes,
    expensesRes,
    revCatsRes,
    revenuesRes,
    billsRes,
  ] = await Promise.all([
    supabase.from("schools").select("id, name, year, default_tuition, passport_fee").eq("id", schoolId).single(),
    supabase.from("professors").select("id, name, instrument, cost_per_student").eq("school_id", schoolId).eq("active", true).order("name"),
    supabase.from("students").select("id, professor_id, name, situation, lesson_day, lesson_time, tuition_amount, enrollment_date, exit_date").eq("school_id", schoolId).order("name"),
    supabase.from("payments").select("id, student_id, year, month, amount, status").eq("school_id", schoolId),
    supabase.from("cost_centers").select("id, name, color, sort_order").eq("school_id", schoolId).order("sort_order"),
    supabase.from("expense_items").select("id, cost_center_id, name, expense_type, cost_centers!inner(school_id)").eq("cost_centers.school_id", schoolId),
    supabase.from("expenses").select("id, expense_item_id, year, month, amount").eq("school_id", schoolId),
    supabase.from("revenue_categories").select("id, name, slug, sort_order").eq("school_id", schoolId).order("sort_order"),
    supabase.from("revenues").select("id, category_id, year, month, amount").eq("school_id", schoolId),
    supabase.from("bills").select("id, expense_item_id, description, bill_type, amount, paid_amount, due_date, paid_at, total_installments, current_installment, status, group_id").eq("school_id", schoolId).order("due_date"),
  ]);

  const err = schoolRes.error || professorsRes.error || studentsRes.error || paymentsRes.error || costCentersRes.error || expenseItemsRes.error || expensesRes.error || revCatsRes.error || revenuesRes.error || billsRes.error;
  if (err || !schoolRes.data) return { data: null, slugMap: {}, error: err?.message || "School not found" };

  const school = schoolRes.data as DbSchool;
  const professors = (professorsRes.data || []) as DbProfessor[];
  const students = (studentsRes.data || []) as DbStudent[];
  const payments = (paymentsRes.data || []) as DbPayment[];
  const costCenters = (costCentersRes.data || []) as DbCostCenter[];
  const expenseItems = ((expenseItemsRes.data || []) as any[]).map((ei: any) => ({ id: ei.id, cost_center_id: ei.cost_center_id, name: ei.name, expense_type: ei.expense_type } as DbExpenseItem));
  const expenses = (expensesRes.data || []) as DbExpense[];
  const revCats = (revCatsRes.data || []) as DbRevenueCategory[];
  const revenues = (revenuesRes.data || []) as DbRevenue[];
  const bills = (billsRes.data || []) as DbBill[];

  const year = school.year;
  const slugMap: SlugMap = {};
  revCats.forEach((c) => { slugMap[c.slug] = c.id; });

  const config: Config = {
    schoolName: school.name,
    year,
    tuition: Number(school.default_tuition),
    passport: Number(school.passport_fee),
  };

  const builtProfessors: Professor[] = professors.map((p) => ({
    id: p.id,
    name: p.name,
    instrument: p.instrument || "",
    costPerStudent: Number(p.cost_per_student),
    students: students
      .filter((s) => s.professor_id === p.id)
      .map((s) => {
        const arr: (number | null)[] = Array(12).fill(null);
        payments
          .filter((pay) => pay.student_id === s.id && pay.year === year)
          .forEach((pay) => {
            arr[pay.month - 1] = Number(pay.amount);
          });
        return {
          id: s.id,
          name: s.name,
          situation: s.situation || "Ativo",
          hour: s.lesson_time || "",
          day: s.lesson_day || "",
          payments: arr,
          enrollmentDate: s.enrollment_date || undefined,
          exitDate: s.exit_date || undefined,
          tuitionAmount: s.tuition_amount ? Number(s.tuition_amount) : undefined,
        } as Student;
      }),
  }));

  const builtExpenses: CostCenter[] = costCenters.map((cc) => ({
    id: cc.id,
    name: cc.name,
    color: cc.color || "#6b7280",
    items: expenseItems
      .filter((ei) => ei.cost_center_id === cc.id)
      .map((ei) => ({
        id: ei.id,
        name: ei.name,
        type: (ei.expense_type === "F" ? "F" : "V") as "F" | "V",
        amounts: Array.from({ length: 12 }, (_, m) => {
          const exp = expenses.find((e) => e.expense_item_id === ei.id && e.year === year && e.month === m + 1);
          return exp ? Number(exp.amount) : 0;
        }),
      } as ExpenseItem)),
  }));

  const builtRevenue: Revenue = { enrollments: Array(12).fill(0), shop: Array(12).fill(0), events: Array(12).fill(0), interest: Array(12).fill(0), other: Array(12).fill(0) };
  revCats.forEach((cat) => {
    const key = cat.slug as keyof Revenue;
    if (key in builtRevenue) {
      builtRevenue[key] = Array.from({ length: 12 }, (_, m) => {
        const rev = revenues.find((r) => r.category_id === cat.id && r.year === year && r.month === m + 1);
        return rev ? Number(rev.amount) : 0;
      });
    }
  });

  const eiMap = new Map(expenseItems.map((ei) => [ei.id, ei.cost_center_id]));
  const builtBills: PayableBill[] = bills.map((b) => ({
    id: b.id,
    description: b.description,
    costCenterId: b.expense_item_id ? (eiMap.get(b.expense_item_id) || "") : "",
    expenseItemId: b.expense_item_id || "",
    type: b.bill_type as PayableBill["type"],
    amount: Number(b.amount),
    paidAmount: b.paid_amount != null ? Number(b.paid_amount) : undefined,
    dueDate: b.due_date,
    paidAt: b.paid_at || undefined,
    totalInstallments: b.total_installments || undefined,
    currentInstallment: b.current_installment || undefined,
    status: b.status as "PENDING" | "PAID",
    groupId: b.group_id || undefined,
  }));

  return {
    data: { config, professors: builtProfessors, expenses: builtExpenses, revenue: builtRevenue, payableBills: builtBills },
    slugMap,
    error: null,
  };
}

// ─── VIEW READS (KPIs) ─────────────────────────────────────────────────────

export async function loadMonthlyKpis(schoolId: string, year: number) {
  return supabase
    .from("view_monthly_kpis")
    .select("*")
    .eq("school_id", schoolId)
    .eq("year", year);
}

export async function loadBreakeven(schoolId: string, year: number) {
  return supabase
    .from("view_breakeven")
    .select("*")
    .eq("school_id", schoolId)
    .eq("year", year);
}

export async function loadAvgTenure(schoolId: string) {
  return supabase
    .from("view_avg_tenure")
    .select("*")
    .eq("school_id", schoolId)
    .maybeSingle();
}

// ─── WRITES: Professors ────────────────────────────────────────────────────

export async function addProfessor(schoolId: string, data: { name: string; instrument: string; costPerStudent: number }) {
  return supabase.from("professors").insert({ school_id: schoolId, name: data.name, instrument: data.instrument, cost_per_student: data.costPerStudent }).select("id, name, instrument, cost_per_student").single();
}

export async function deleteProfessor(profId: string) {
  return supabase.from("professors").delete().eq("id", profId);
}

// ─── WRITES: Students ──────────────────────────────────────────────────────

export async function addStudent(schoolId: string, data: { professorId: string; name: string; day: string; time: string; tuition?: number }) {
  return supabase.from("students").insert({
    school_id: schoolId,
    professor_id: data.professorId,
    name: data.name,
    situation: "Ativo",
    lesson_day: data.day,
    lesson_time: data.time,
    tuition_amount: data.tuition || null,
  }).select("id, professor_id, name, situation, lesson_day, lesson_time, tuition_amount, enrollment_date").single();
}

export async function deleteStudent(studentId: string) {
  return supabase.from("students").delete().eq("id", studentId);
}

// ─── WRITES: Payments ──────────────────────────────────────────────────────

export async function upsertPayment(data: { studentId: string; schoolId: string; year: number; month: number; amount: number | null; status: string }) {
  if (data.amount === null) {
    return supabase.from("payments").delete().eq("student_id", data.studentId).eq("year", data.year).eq("month", data.month);
  }
  const { data: existing } = await supabase.from("payments").select("id").eq("student_id", data.studentId).eq("year", data.year).eq("month", data.month).maybeSingle();
  if (existing) {
    return supabase.from("payments").update({ amount: data.amount, status: data.status }).eq("id", existing.id);
  }
  return supabase.from("payments").insert({ student_id: data.studentId, school_id: data.schoolId, year: data.year, month: data.month, amount: data.amount, status: data.status });
}

// ─── WRITES: Cost Centers ──────────────────────────────────────────────────

export async function addCostCenter(schoolId: string, data: { name: string; color: string }) {
  return supabase.from("cost_centers").insert({ school_id: schoolId, name: data.name, color: data.color }).select("id, name, color, sort_order").single();
}

export async function deleteCostCenter(ccId: string) {
  await supabase.from("expense_items").delete().eq("cost_center_id", ccId);
  return supabase.from("cost_centers").delete().eq("id", ccId);
}

// ─── WRITES: Expense Items ─────────────────────────────────────────────────

export async function addExpenseItem(costCenterId: string, data: { name: string; expenseType: "F" | "V" }) {
  return supabase.from("expense_items").insert({ cost_center_id: costCenterId, name: data.name, expense_type: data.expenseType }).select("id, cost_center_id, name, expense_type").single();
}

export async function deleteExpenseItem(eiId: string) {
  await supabase.from("expenses").delete().eq("expense_item_id", eiId);
  return supabase.from("expense_items").delete().eq("id", eiId);
}

// ─── WRITES: Expenses (amounts) ────────────────────────────────────────────

export async function upsertExpense(data: { expenseItemId: string; schoolId: string; year: number; month: number; amount: number }) {
  const { data: existing } = await supabase.from("expenses").select("id").eq("expense_item_id", data.expenseItemId).eq("year", data.year).eq("month", data.month).maybeSingle();
  if (existing) {
    return supabase.from("expenses").update({ amount: data.amount }).eq("id", existing.id);
  }
  return supabase.from("expenses").insert({ expense_item_id: data.expenseItemId, school_id: data.schoolId, year: data.year, month: data.month, amount: data.amount });
}

// ─── WRITES: Revenue ───────────────────────────────────────────────────────

export async function upsertRevenue(data: { schoolId: string; categoryId: string; year: number; month: number; amount: number }) {
  const { data: existing } = await supabase.from("revenues").select("id").eq("category_id", data.categoryId).eq("year", data.year).eq("month", data.month).maybeSingle();
  if (existing) {
    return supabase.from("revenues").update({ amount: data.amount }).eq("id", existing.id);
  }
  return supabase.from("revenues").insert({ school_id: data.schoolId, category_id: data.categoryId, year: data.year, month: data.month, amount: data.amount });
}

// ─── WRITES: Bills ─────────────────────────────────────────────────────────

export async function createBills(schoolId: string, bills: Array<{
  description: string; expenseItemId: string; billType: string; amount: number;
  dueDate: string; totalInstallments?: number; currentInstallment?: number;
  status?: string; groupId?: string;
}>) {
  const rows = bills.map((b) => ({
    school_id: schoolId,
    expense_item_id: b.expenseItemId || null,
    description: b.description,
    bill_type: b.billType,
    amount: b.amount,
    due_date: b.dueDate,
    total_installments: b.totalInstallments || null,
    current_installment: b.currentInstallment || null,
    status: b.status || "PENDING",
    group_id: b.groupId || null,
  }));
  return supabase.from("bills").insert(rows).select("id, expense_item_id, description, bill_type, amount, paid_amount, due_date, paid_at, total_installments, current_installment, status, group_id");
}

export async function updateBill(billId: string, data: { amount?: number; dueDate?: string; status?: string; paidAmount?: number; paidAt?: string }) {
  const update: any = {};
  if (data.amount !== undefined) update.amount = data.amount;
  if (data.dueDate !== undefined) update.due_date = data.dueDate;
  if (data.status !== undefined) update.status = data.status;
  if (data.paidAmount !== undefined) update.paid_amount = data.paidAmount;
  if (data.paidAt !== undefined) update.paid_at = data.paidAt;
  return supabase.from("bills").update(update).eq("id", billId);
}

export async function deleteBills(billIds: string[]) {
  return supabase.from("bills").delete().in("id", billIds);
}

// ─── WRITES: Config (school) ───────────────────────────────────────────────

export async function updateSchoolConfig(schoolId: string, data: { name?: string; year?: number; defaultTuition?: number; passportFee?: number }) {
  const update: any = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.year !== undefined) update.year = data.year;
  if (data.defaultTuition !== undefined) update.default_tuition = data.defaultTuition;
  if (data.passportFee !== undefined) update.passport_fee = data.passportFee;
  return supabase.from("schools").update(update).eq("id", schoolId);
}

// ─── WRITES: Reset ─────────────────────────────────────────────────────────

export async function resetSchoolData(schoolId: string) {
  return supabase.rpc("reset_school_data", { p_school_id: schoolId });
}
