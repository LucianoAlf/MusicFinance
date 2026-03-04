import { supabase } from "./supabase";
import type {
  DashboardData,
  Professor,
  Student,
  Payment,
  PaymentStatus,
  Instrument,
  CostCenter,
  ExpenseItem,
  RevenueCategory,
  PayableBill,
  Config,
} from "../types";

// ─── Row types from Supabase ───────────────────────────────────────────────
interface DbProfessor { id: string; name: string; instrument: string; cost_per_student: number; avatar_url: string | null; }
interface DbStudent { id: string; professor_id: string; person_id: string; name: string; situation: string; lesson_day: string | null; lesson_time: string | null; tuition_amount: number | null; enrollment_date: string | null; exit_date: string | null; instrument_id: string | null; phone: string | null; responsible_name: string | null; responsible_phone: string | null; }
interface DbInstrument { id: string; school_id: string; name: string; }
interface DbProfInstrument { professor_id: string; instrument_id: string; instruments: { id: string; name: string } | { id: string; name: string }[] | null; }
interface DbPayment { id: string; student_id: string; year: number; month: number; amount: number; status: string; }
interface DbCostCenter { id: string; name: string; color: string; sort_order: number; }
interface DbExpenseItem { id: string; cost_center_id: string; name: string; expense_type: string; }
interface DbExpense { id: string; expense_item_id: string; year: number; month: number; amount: number; }
interface DbRevenueCategory { id: string; name: string; slug: string; sort_order: number; }
interface DbRevenue { id: string; category_id: string; year: number; month: number; amount: number; }
interface DbBill { id: string; expense_item_id: string | null; description: string; bill_type: string; amount: number; paid_amount: number | null; due_date: string; paid_at: string | null; total_installments: number | null; current_installment: number | null; status: string; group_id: string | null; competence_month: number | null; competence_year: number | null; }
interface DbSchool { id: string; name: string; year: number; default_tuition: number; passport_fee: number; }

// ─── Slug map for revenue categories ───────────────────────────────────────
export type SlugMap = Record<string, string>; // slug -> id

// ─── LOAD ──────────────────────────────────────────────────────────────────

export async function loadSchoolData(schoolId: string): Promise<{ data: DashboardData | null; slugMap: SlugMap; instruments: Instrument[]; error: string | null }> {
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
    instrumentsRes,
    profInstrumentsRes,
  ] = await Promise.all([
    supabase.from("schools").select("id, name, year, default_tuition, passport_fee").eq("id", schoolId).single(),
    supabase.from("professors").select("id, name, instrument, cost_per_student, avatar_url").eq("school_id", schoolId).eq("active", true).order("name"),
    supabase.from("students").select("id, professor_id, person_id, name, situation, lesson_day, lesson_time, tuition_amount, enrollment_date, exit_date, instrument_id, phone, responsible_name, responsible_phone").eq("school_id", schoolId).order("name"),
    supabase.from("payments").select("id, student_id, year, month, amount, status").eq("school_id", schoolId),
    supabase.from("cost_centers").select("id, name, color, sort_order").eq("school_id", schoolId).order("sort_order"),
    supabase.from("expense_items").select("id, cost_center_id, name, expense_type, cost_centers!inner(school_id)").eq("cost_centers.school_id", schoolId),
    supabase.from("expenses").select("id, expense_item_id, year, month, amount").eq("school_id", schoolId),
    supabase.from("revenue_categories").select("id, name, slug, sort_order").eq("school_id", schoolId).order("sort_order"),
    supabase.from("revenues").select("id, category_id, year, month, amount").eq("school_id", schoolId),
    supabase.from("bills").select("id, expense_item_id, description, bill_type, amount, paid_amount, due_date, paid_at, total_installments, current_installment, status, group_id, competence_month, competence_year").eq("school_id", schoolId).order("due_date"),
    supabase.from("instruments").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("professor_instruments").select("professor_id, instrument_id, instruments(id, name)"),
  ]);

  const err = schoolRes.error || professorsRes.error || studentsRes.error || paymentsRes.error || costCentersRes.error || expenseItemsRes.error || expensesRes.error || revCatsRes.error || revenuesRes.error || billsRes.error;
  if (err || !schoolRes.data) return { data: null, slugMap: {}, instruments: [], error: err?.message || "School not found" };

  const school = schoolRes.data as DbSchool;
  const professors = (professorsRes.data || []) as DbProfessor[];
  const students = (studentsRes.data || []) as (DbStudent)[];
  const payments = (paymentsRes.data || []) as DbPayment[];
  const allInstruments = (instrumentsRes.data || []) as DbInstrument[];
  const profInstruments = (profInstrumentsRes.data || []) as DbProfInstrument[];
  const profIds = new Set(professors.map(p => p.id));
  const filteredProfInstruments = profInstruments.filter(pi => profIds.has(pi.professor_id));
  const instrumentMap = new Map(allInstruments.map(i => [i.id, i.name]));
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

  const builtProfessors: Professor[] = professors.map((p) => {
    const profInsts: Instrument[] = filteredProfInstruments
      .filter(pi => pi.professor_id === p.id)
      .map(pi => {
        const inst = Array.isArray(pi.instruments) ? pi.instruments[0] : pi.instruments;
        return {
          id: inst?.id || pi.instrument_id,
          name: inst?.name || instrumentMap.get(pi.instrument_id) || "",
        };
      });
    return {
      id: p.id,
      name: p.name,
      instrument: p.instrument || "",
      costPerStudent: Number(p.cost_per_student),
      avatarUrl: p.avatar_url || undefined,
      instruments: profInsts,
      students: students
        .filter((s) => s.professor_id === p.id)
        .map((s) => {
          const arr: (Payment | null)[] = Array(12).fill(null);
          payments
            .filter((pay) => pay.student_id === s.id && pay.year === year)
            .forEach((pay) => {
              arr[pay.month - 1] = { amount: Number(pay.amount), status: (pay.status || "PENDING") as PaymentStatus };
            });
          return {
            id: s.id,
            personId: s.person_id || s.id,
            name: s.name,
            situation: s.situation || "Ativo",
            hour: s.lesson_time || "",
            day: s.lesson_day || "",
            payments: arr,
            enrollmentDate: s.enrollment_date || undefined,
            exitDate: s.exit_date || undefined,
            tuitionAmount: s.tuition_amount ? Number(s.tuition_amount) : undefined,
            instrumentId: s.instrument_id || undefined,
            instrumentName: s.instrument_id ? instrumentMap.get(s.instrument_id) : undefined,
            phone: s.phone || undefined,
            responsibleName: s.responsible_name || undefined,
            responsiblePhone: s.responsible_phone || undefined,
          } as Student;
        }),
    };
  });

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

  const builtRevenue: RevenueCategory[] = revCats.map((cat) => {
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      amounts: Array.from({ length: 12 }, (_, m) => {
        const rev = revenues.find((r) => r.category_id === cat.id && r.year === year && r.month === m + 1);
        return rev ? Number(rev.amount) : 0;
      }),
    };
  });

  const eiMap = new Map(expenseItems.map((ei) => [ei.id, ei.cost_center_id]));
  const builtBills: PayableBill[] = bills.map((b) => ({
    id: b.id,
    description: b.description,
    costCenterId: b.expense_item_id ? (eiMap.get(b.expense_item_id) || "") : "",
    expenseItemId: b.expense_item_id || "",
    type: (b.bill_type === "RECURRENT_FIXED" || b.bill_type === "RECURRENT_VARIABLE" ? "RECURRENT" : b.bill_type) as PayableBill["type"],
    amount: Number(b.amount),
    paidAmount: b.paid_amount != null ? Number(b.paid_amount) : undefined,
    dueDate: b.due_date,
    paidAt: b.paid_at || undefined,
    totalInstallments: b.total_installments || undefined,
    currentInstallment: b.current_installment || undefined,
    status: b.status as "PENDING" | "PAID",
    groupId: b.group_id || undefined,
    competenceMonth: b.competence_month ?? undefined,
    competenceYear: b.competence_year ?? undefined,
  }));

  return {
    data: { config, professors: builtProfessors, expenses: builtExpenses, revenue: builtRevenue, payableBills: builtBills },
    slugMap,
    instruments: allInstruments.map(i => ({ id: i.id, name: i.name })),
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

export async function addProfessor(schoolId: string, data: { name: string; instrument: string; costPerStudent: number; instrumentIds?: string[]; avatarUrl?: string }) {
  const row: any = { school_id: schoolId, name: data.name, instrument: data.instrument, cost_per_student: data.costPerStudent };
  if (data.avatarUrl) row.avatar_url = data.avatarUrl;
  const res = await supabase.from("professors").insert(row).select("id, name, instrument, cost_per_student, avatar_url").single();
  if (res.data && data.instrumentIds && data.instrumentIds.length > 0) {
    const links = data.instrumentIds.map(iid => ({ professor_id: res.data.id, instrument_id: iid }));
    await supabase.from("professor_instruments").insert(links);
  }
  return res;
}

export async function updateProfessor(profId: string, data: { name?: string; costPerStudent?: number; avatarUrl?: string | null }) {
  const update: any = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.costPerStudent !== undefined) update.cost_per_student = data.costPerStudent;
  if (data.avatarUrl !== undefined) update.avatar_url = data.avatarUrl;
  return supabase.from("professors").update(update).eq("id", profId).select("id, name, instrument, cost_per_student, avatar_url").single();
}

export async function deleteProfessor(profId: string) {
  return supabase.from("professors").delete().eq("id", profId);
}

// ─── WRITES: Professor Avatar ─────────────────────────────────────────────

export async function uploadProfessorAvatar(file: Blob, schoolId: string, professorId: string): Promise<string | null> {
  const path = `${schoolId}/${professorId}.jpg`;
  const { error: rmErr } = await supabase.storage.from("professor-avatars").remove([path]);
  if (rmErr) console.warn("Remove old avatar:", rmErr.message);
  const { error } = await supabase.storage.from("professor-avatars").upload(path, file, { contentType: "image/jpeg", upsert: true });
  if (error) { console.error("Upload avatar error:", error.message); return null; }
  const { data: urlData } = supabase.storage.from("professor-avatars").getPublicUrl(path);
  return urlData?.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : null;
}

export async function deleteProfessorAvatar(schoolId: string, professorId: string): Promise<void> {
  const path = `${schoolId}/${professorId}.jpg`;
  await supabase.storage.from("professor-avatars").remove([path]);
}

// ─── WRITES: Students ──────────────────────────────────────────────────────

export async function addStudent(schoolId: string, data: { professorId: string; name: string; day: string; time: string; tuition?: number; enrollmentDate?: string; instrumentId?: string; personId?: string }) {
  const row: any = {
    school_id: schoolId,
    professor_id: data.professorId,
    name: data.name,
    situation: "Ativo",
    lesson_day: data.day,
    lesson_time: data.time,
    tuition_amount: data.tuition || null,
    enrollment_date: data.enrollmentDate || new Date().toISOString().split("T")[0],
    instrument_id: data.instrumentId || null,
  };
  if (data.personId) row.person_id = data.personId;
  return supabase.from("students").insert(row).select("id, professor_id, person_id, name, situation, lesson_day, lesson_time, tuition_amount, enrollment_date, instrument_id").single();
}

export async function updateStudent(studentId: string, data: { name?: string; situation?: string; day?: string; hour?: string; enrollmentDate?: string; tuitionAmount?: number; instrumentId?: string; phone?: string; responsibleName?: string; responsiblePhone?: string }) {
  const update: any = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.situation !== undefined) update.situation = data.situation;
  if (data.day !== undefined) update.lesson_day = data.day;
  if (data.hour !== undefined) update.lesson_time = data.hour;
  if (data.enrollmentDate !== undefined) update.enrollment_date = data.enrollmentDate;
  if (data.tuitionAmount !== undefined) update.tuition_amount = data.tuitionAmount;
  if (data.instrumentId !== undefined) update.instrument_id = data.instrumentId;
  if (data.phone !== undefined) update.phone = data.phone;
  if (data.responsibleName !== undefined) update.responsible_name = data.responsibleName;
  if (data.responsiblePhone !== undefined) update.responsible_phone = data.responsiblePhone;
  return supabase.from("students").update(update).eq("id", studentId).select("id, name, situation, lesson_day, lesson_time, tuition_amount, enrollment_date, exit_date, instrument_id, phone, responsible_name, responsible_phone").single();
}

export async function deleteStudent(studentId: string) {
  return supabase.from("students").delete().eq("id", studentId);
}

// ─── WRITES: Payments ──────────────────────────────────────────────────────

export async function upsertPayment(data: { studentId: string; schoolId: string; year: number; month: number; amount: number | null; status: string; paidAt?: string | null }) {
  if (data.amount === null) {
    return supabase.from("payments").delete().eq("student_id", data.studentId).eq("year", data.year).eq("month", data.month);
  }
  const row: any = { amount: data.amount, status: data.status };
  if (data.paidAt !== undefined) row.paid_at = data.paidAt;
  const { data: existing } = await supabase.from("payments").select("id").eq("student_id", data.studentId).eq("year", data.year).eq("month", data.month).maybeSingle();
  if (existing) {
    return supabase.from("payments").update(row).eq("id", existing.id);
  }
  return supabase.from("payments").insert({ student_id: data.studentId, school_id: data.schoolId, year: data.year, month: data.month, ...row });
}

// ─── WRITES: Cost Centers ──────────────────────────────────────────────────

export async function addCostCenter(schoolId: string, data: { name: string; color: string }) {
  return supabase.from("cost_centers").insert({ school_id: schoolId, name: data.name, color: data.color }).select("id, name, color, sort_order").single();
}

export async function updateCostCenter(ccId: string, data: { name?: string; color?: string }) {
  const update: any = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.color !== undefined) update.color = data.color;
  return supabase.from("cost_centers").update(update).eq("id", ccId).select("id, name, color, sort_order").single();
}

export async function deleteCostCenter(ccId: string) {
  await supabase.from("expense_items").delete().eq("cost_center_id", ccId);
  return supabase.from("cost_centers").delete().eq("id", ccId);
}

// ─── WRITES: Expense Items ─────────────────────────────────────────────────

export async function addExpenseItem(costCenterId: string, data: { name: string; expenseType: "F" | "V" }) {
  return supabase.from("expense_items").insert({ cost_center_id: costCenterId, name: data.name, expense_type: data.expenseType }).select("id, cost_center_id, name, expense_type").single();
}

export async function updateExpenseItem(eiId: string, data: { name?: string; expenseType?: "F" | "V" }) {
  const update: any = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.expenseType !== undefined) update.expense_type = data.expenseType;
  return supabase.from("expense_items").update(update).eq("id", eiId).select("id, cost_center_id, name, expense_type").single();
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

export async function addRevenueCategory(schoolId: string, name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  return supabase.from("revenue_categories").insert({ school_id: schoolId, name, slug }).select("id, name, slug, sort_order").single();
}

export async function updateRevenueCategory(categoryId: string, name: string) {
  return supabase.from("revenue_categories").update({ name }).eq("id", categoryId).select("id, name, slug, sort_order").single();
}

export async function deleteRevenueCategory(categoryId: string) {
  await supabase.from("revenues").delete().eq("category_id", categoryId);
  return supabase.from("revenue_categories").delete().eq("id", categoryId);
}

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
  status?: string; groupId?: string; paidAmount?: number; paidAt?: string;
  competenceMonth?: number; competenceYear?: number;
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
    paid_amount: b.paidAmount ?? null,
    paid_at: b.paidAt ?? null,
    competence_month: b.competenceMonth ?? null,
    competence_year: b.competenceYear ?? null,
  }));
  return supabase.from("bills").insert(rows).select("id, expense_item_id, description, bill_type, amount, paid_amount, due_date, paid_at, total_installments, current_installment, status, group_id, competence_month, competence_year");
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

export async function getRecurrentBillsForYear(schoolId: string, year: number) {
  return supabase
    .from("bills")
    .select("id, expense_item_id, description, bill_type, amount, group_id, competence_month, competence_year")
    .eq("school_id", schoolId)
    .eq("bill_type", "RECURRENT")
    .gte("due_date", `${year}-01-01`)
    .lte("due_date", `${year}-12-31`);
}

export async function replicateRecurrentBills(schoolId: string, fromYear: number, toYear: number) {
  const { data: existing } = await getRecurrentBillsForYear(schoolId, fromYear);
  if (!existing || existing.length === 0) return { created: 0 };

  const { data: alreadyInTarget } = await getRecurrentBillsForYear(schoolId, toYear);
  if (alreadyInTarget && alreadyInTarget.length > 0) return { created: 0, skipped: true };

  const groupMap = new Map<string, typeof existing>();
  for (const bill of existing) {
    const key = bill.group_id || bill.id;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(bill);
  }

  const rows: any[] = [];
  for (const [, bills] of groupMap) {
    const template = bills[0];
    const newGroupId = crypto.randomUUID();
    for (let m = 0; m < 12; m++) {
      const day = "15";
      rows.push({
        school_id: schoolId,
        expense_item_id: template.expense_item_id,
        description: template.description,
        bill_type: "RECURRENT",
        amount: template.amount,
        due_date: `${toYear}-${String(m + 1).padStart(2, "0")}-${day}`,
        status: "PENDING",
        group_id: newGroupId,
        competence_month: m,
        competence_year: toYear,
      });
    }
  }

  if (rows.length === 0) return { created: 0 };
  const { error } = await supabase.from("bills").insert(rows);
  return { created: rows.length, error };
}

// ─── WRITES: Instruments ────────────────────────────────────────────────────

export async function addInstrument(schoolId: string, name: string) {
  return supabase.from("instruments").insert({ school_id: schoolId, name }).select("id, name").single();
}

export async function deleteInstrument(instrumentId: string) {
  return supabase.from("instruments").delete().eq("id", instrumentId);
}

export async function addProfessorInstrument(profId: string, instrumentId: string) {
  return supabase.from("professor_instruments").insert({ professor_id: profId, instrument_id: instrumentId });
}

export async function removeProfessorInstrument(profId: string, instrumentId: string) {
  return supabase.from("professor_instruments").delete().eq("professor_id", profId).eq("instrument_id", instrumentId);
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
