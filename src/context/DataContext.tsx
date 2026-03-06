import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { DashboardData, Instrument, Payment, PaymentStatus, PayableBill, ViewKpis } from "../types";
import { useAuth } from "./AuthContext";
import { MS } from "../lib/utils";
import {
  loadSchoolData,
  loadMonthlyKpis,
  loadBreakeven,
  loadAvgTenure,
  addProfessor as apiAddProfessor,
  updateProfessor as apiUpdateProfessor,
  deleteProfessor as apiDeleteProfessor,
  addStudent as apiAddStudent,
  updateStudent as apiUpdateStudent,
  deleteStudent as apiDeleteStudent,
  upsertPayment as apiUpsertPayment,
  addCostCenter as apiAddCostCenter,
  updateCostCenter as apiUpdateCostCenter,
  deleteCostCenter as apiDeleteCostCenter,
  addExpenseItem as apiAddExpenseItem,
  updateExpenseItem as apiUpdateExpenseItem,
  deleteExpenseItem as apiDeleteExpenseItem,
  upsertExpense as apiUpsertExpense,
  upsertRevenue as apiUpsertRevenue,
  addRevenueCategory as apiAddRevenueCategory,
  updateRevenueCategory as apiUpdateRevenueCategory,
  deleteRevenueCategory as apiDeleteRevenueCategory,
  createBills as apiCreateBills,
  updateBill as apiUpdateBill,
  deleteBills as apiDeleteBills,
  replicateRecurrentBills as apiReplicateRecurrent,
  updateSchoolConfig as apiUpdateSchoolConfig,
  resetSchoolData as apiResetSchoolData,
  addInstrument as apiAddInstrument,
  deleteInstrument as apiDeleteInstrument,
  addProfessorInstrument as apiAddProfInst,
  removeProfessorInstrument as apiRemoveProfInst,
  type SlugMap,
} from "../lib/supabaseData";

type SaveStatus = "saving" | "saved" | "idle" | "error";

interface DataContextType {
  data: DashboardData | null;
  setData: React.Dispatch<React.SetStateAction<DashboardData | null>>;
  instruments: Instrument[];
  dark: boolean;
  setDark: React.Dispatch<React.SetStateAction<boolean>>;
  page: string;
  setPage: React.Dispatch<React.SetStateAction<string>>;
  sideCol: boolean;
  setSideCol: React.Dispatch<React.SetStateAction<boolean>>;
  curMo: number;
  setCurMo: React.Dispatch<React.SetStateAction<number>>;
  selProf: string | null;
  setSelProf: React.Dispatch<React.SetStateAction<string | null>>;
  selPay: string | null;
  setSelPay: React.Dispatch<React.SetStateAction<string | null>>;
  calcMo: (m: number) => any;
  saveStatus: SaveStatus;
  handleAddProfessor: (d: { name: string; instrument: string; costPerStudent: number; instrumentIds?: string[] }) => Promise<void>;
  handleUpdateProfessor: (profId: string, updates: { name?: string; costPerStudent?: number }) => Promise<void>;
  handleDeleteProfessor: (profId: string) => Promise<void>;
  handleAddStudent: (profId: string, d: { name: string; day: string; time: string; tuition?: number; enrollmentDate?: string; instrumentId?: string; personId?: string; dueDay?: number; paymentMethod?: string }) => Promise<void>;
  handleUpdateStudent: (studentId: string, updates: { name?: string; situation?: string; day?: string; hour?: string; enrollmentDate?: string; tuitionAmount?: number; instrumentId?: string; phone?: string; responsibleName?: string; responsiblePhone?: string; dueDay?: number; paymentMethod?: string }) => Promise<void>;
  handleAddInstrument: (name: string) => Promise<Instrument | null>;
  handleAddProfessorInstrument: (profId: string, instrumentId: string) => Promise<void>;
  handleRemoveProfessorInstrument: (profId: string, instrumentId: string) => Promise<void>;
  handleDeleteStudent: (profId: string, studentId: string) => Promise<void>;
  handleConfirmPayment: (profId: string, studentId: string, month: number, amount: number) => Promise<void>;
  handleWaivePayment: (profId: string, studentId: string, month: number) => Promise<void>;
  handleRevertPayment: (profId: string, studentId: string, month: number, expectedAmount: number) => Promise<void>;
  handleAddCostCenter: (d: { name: string; color: string }) => Promise<string>;
  handleUpdateCostCenter: (ccId: string, updates: { name?: string; color?: string }) => Promise<void>;
  handleDeleteCostCenter: (ccId: string) => Promise<void>;
  handleAddExpenseItem: (ccId: string, d: { name: string; type: "F" | "V" }) => Promise<string>;
  handleUpdateExpenseItem: (ccId: string, eiId: string, updates: { name?: string; type?: "F" | "V" }) => Promise<void>;
  handleDeleteExpenseItem: (ccId: string, eiId: string) => Promise<void>;
  handleUpdateExpense: (ccId: string, eiId: string, month: number, amount: number) => Promise<void>;
  handleAddRevenueCategory: (name: string) => Promise<string>;
  handleUpdateRevenueCategory: (categoryId: string, name: string) => Promise<void>;
  handleDeleteRevenueCategory: (categoryId: string) => Promise<void>;
  handleUpdateRevenue: (categoryId: string, month: number, amount: number) => Promise<void>;
  handleSaveBills: (bills: PayableBill[], expenseUpdates: Array<{ ccId: string; eiId: string; month: number; delta: number }>) => Promise<void>;
  handleUpdateBill: (billId: string, updates: Partial<PayableBill>, expenseUpdates?: Array<{ ccId: string; eiId: string; month: number; delta: number }>) => Promise<void>;
  handleDeleteBills: (billIds: string[], expenseUpdates: Array<{ ccId: string; eiId: string; month: number; delta: number }>) => Promise<void>;
  handleToggleBillStatus: (billId: string) => Promise<void>;
  handleUpdateConfig: (key: string, value: string | number) => Promise<void>;
  handleResetData: () => Promise<void>;
  refreshData: () => Promise<void>;
  viewKpis: ViewKpis | null;
  refreshKpis: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedSchool, setSelectedSchool } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("mf_dark_mode");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("mf_dark_mode", JSON.stringify(dark));
  }, [dark]);
  const [page, setPage] = useState("dash");
  const [sideCol, setSideCol] = useState(false);
  const [curMo, setCurMo] = useState(new Date().getMonth());
  const [selProf, setSelProf] = useState<string | null>(null);
  const [selPay, setSelPay] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [viewKpis, setViewKpis] = useState<ViewKpis | null>(null);
  const slugMapRef = useRef<SlugMap>({});
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const markSaving = useCallback(() => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSaveStatus("saving");
  }, []);

  const markSaved = useCallback(() => {
    setSaveStatus("saved");
    savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
  }, []);

  const markError = useCallback(() => {
    setSaveStatus("error");
    savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
  }, []);

  const schoolId = selectedSchool?.id;

  const fetchData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const result = await loadSchoolData(schoolId);
    if (result.data) {
      setData(result.data);
      slugMapRef.current = result.slugMap;
      setInstruments(result.instruments);
    }
    setLoading(false);
  }, [schoolId]);

  const refreshKpis = useCallback(async () => {
    if (!schoolId || !data) return;
    const year = data.config.year;
    const [kpisRes, breakevenRes, tenureRes] = await Promise.all([
      loadMonthlyKpis(schoolId, year),
      loadBreakeven(schoolId, year),
      loadAvgTenure(schoolId),
    ]);
    setViewKpis({
      monthly: (kpisRes.data || []).map((k: any) => ({
        month: k.month,
        tuitionRevenue: Number(k.tuition_revenue),
        payingStudents: Number(k.paying_students),
        activeStudents: Number(k.active_students),
        newEnrollments: Number(k.new_enrollments),
        churnedStudents: Number(k.churned_students),
        professorPayroll: Number(k.professor_payroll),
        churnRate: Number(k.churn_rate),
      })),
      breakeven: (breakevenRes.data || []).map((b: any) => ({
        month: b.month,
        fixedCosts: Number(b.fixed_costs),
        variableCosts: Number(b.variable_costs),
        revenue: Number(b.revenue),
        breakevenRevenue: b.breakeven_revenue != null ? Number(b.breakeven_revenue) : null,
      })),
      avgTenureMonths: tenureRes.data?.avg_tenure_months ? Number(tenureRes.data.avg_tenure_months) : 0,
    });
  }, [schoolId, data]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (data) refreshKpis(); }, [data, refreshKpis]);

  useEffect(() => {
    if (dark) { document.body.classList.add("dark"); document.body.classList.remove("light"); }
    else { document.body.classList.add("light"); document.body.classList.remove("dark"); }
  }, [dark]);

  const calcMo = (m: number) => {
    if (!data) return null;
    let tui = 0, pp = 0, expectedTui = 0;
    const paidPersonIds = new Set<string>();
    const activePersonIds = new Set<string>();
    (data.professors || []).forEach((p) => {
      let activeForProf = 0;
      (p.students || []).forEach((s) => {
        if (s.situation === "Ativo") {
          activePersonIds.add(s.personId || s.id);
          expectedTui += s.tuitionAmount || 0;
          activeForProf++;
        }
        const pm = s.payments && s.payments[m];
        if (pm && pm.status === "PAID" && pm.amount > 0) { tui += pm.amount; paidPersonIds.add(s.personId || s.id); }
      });
      pp += activeForProf * p.costPerStudent;
    });
    const ps = paidPersonIds.size;
    const activeCount = activePersonIds.size;
    const rv = data.revenue || [];
    const extraRev = rv.reduce((sum, rc) => sum + (rc.amounts?.[m] || 0), 0);
    const rev = tui + extraRev;
    const expectedRevenue = expectedTui + extraRev;
    let exp = pp, fc = pp, vc = 0;
    (data.expenses || []).forEach((cc) =>
      (cc.items || []).forEach((it) => { const a = it.amounts?.[m] || 0; exp += a; if (it.type === "F") fc += a; else vc += a; })
    );
    return { month: MS[m], revenue: rev, expectedRevenue, expenses: exp, profit: rev - exp, margin: rev > 0 ? (rev - exp) / rev : 0, tuition: tui, payingStudents: ps, activeStudents: activeCount, profPayroll: pp, ticket: ps > 0 ? tui / ps : 0, fixedCost: fc, varCost: vc, costPerStudent: activeCount > 0 ? exp / activeCount : 0 };
  };

  // ─── Write handlers ────────────────────────────────────────────────────

  const handleAddProfessor = async (d: { name: string; instrument: string; costPerStudent: number; instrumentIds?: string[]; avatarUrl?: string }) => {
    if (!data || !schoolId) return;
    markSaving();
    const { data: row, error } = await apiAddProfessor(schoolId, d);
    if (error || !row) { markError(); return; }
    const profInsts = (d.instrumentIds || []).map(iid => {
      const inst = instruments.find(i => i.id === iid);
      return { id: iid, name: inst?.name || "" };
    });
    setData((prev) => prev ? { ...prev, professors: [...prev.professors, { id: row.id, name: row.name, instrument: row.instrument || "", costPerStudent: Number(row.cost_per_student), avatarUrl: row.avatar_url || undefined, instruments: profInsts, students: [] }] } : prev);
    setSelProf(row.id);
    markSaved();
    return row.id as string;
  };

  const handleUpdateProfessor = async (profId: string, updates: { name?: string; costPerStudent?: number; avatarUrl?: string | null }) => {
    if (!data || !schoolId) return;
    markSaving();
    const { data: row, error } = await apiUpdateProfessor(profId, updates);
    if (error || !row) { markError(); return; }
    setData((prev) => prev ? {
      ...prev,
      professors: prev.professors.map((p) => p.id === profId ? {
        ...p,
        name: row.name ?? p.name,
        costPerStudent: Number(row.cost_per_student) ?? p.costPerStudent,
        avatarUrl: row.avatar_url !== undefined ? (row.avatar_url || undefined) : p.avatarUrl,
      } : p),
    } : prev);
    markSaved();
  };

  const handleDeleteProfessor = async (profId: string) => {
    if (!data) return;
    markSaving();
    const { error } = await apiDeleteProfessor(profId);
    if (error) { markError(); return; }
    setData((prev) => prev ? { ...prev, professors: prev.professors.filter((p) => p.id !== profId) } : prev);
    setSelProf(null);
    markSaved();
  };

  const handleAddStudent = async (profId: string, d: { name: string; day: string; time: string; tuition?: number; enrollmentDate?: string; instrumentId?: string; personId?: string; dueDay?: number; paymentMethod?: string }) => {
    if (!data || !schoolId) return;
    markSaving();
    const tuitionVal = d.tuition || data.config.tuition;
    const enrollDate = d.enrollmentDate || new Date().toISOString().split("T")[0];
    const { data: row, error } = await apiAddStudent(schoolId, { professorId: profId, name: d.name, day: d.day, time: d.time, tuition: tuitionVal, enrollmentDate: enrollDate, instrumentId: d.instrumentId, personId: d.personId, paymentMethod: d.paymentMethod });
    if (error || !row) { markError(); return; }

    const payments12: (Payment | null)[] = [];
    const paymentInserts = [];
    for (let m = 0; m < 12; m++) {
      paymentInserts.push({ studentId: row.id, schoolId, year: data.config.year, month: m + 1, amount: tuitionVal, status: "PENDING", paidAt: null });
      payments12.push({ amount: tuitionVal, status: "PENDING" as PaymentStatus });
    }
    for (const pi of paymentInserts) await apiUpsertPayment(pi);

    const instName = d.instrumentId ? instruments.find(i => i.id === d.instrumentId)?.name : undefined;
    const newStudent = { id: row.id, personId: row.person_id || row.id, name: row.name, situation: "Ativo", hour: row.lesson_time || "", day: row.lesson_day || "", payments: payments12, enrollmentDate: row.enrollment_date || enrollDate, tuitionAmount: tuitionVal, instrumentId: d.instrumentId, instrumentName: instName, dueDay: row.due_day ?? 5, paymentMethod: row.payment_method || d.paymentMethod };
    setData((prev) => prev ? { ...prev, professors: prev.professors.map((p) => p.id === profId ? { ...p, students: [...p.students, newStudent] } : p) } : prev);
    markSaved();
  };

  const handleUpdateStudent = async (studentId: string, updates: { name?: string; situation?: string; day?: string; hour?: string; enrollmentDate?: string; tuitionAmount?: number; instrumentId?: string; phone?: string; responsibleName?: string; responsiblePhone?: string; dueDay?: number; paymentMethod?: string }) => {
    if (!data || !schoolId) return;
    markSaving();
    const { data: row, error } = await apiUpdateStudent(studentId, updates);
    if (error || !row) { markError(); return; }
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        professors: prev.professors.map((p) => ({
          ...p,
          students: p.students.map((s) => s.id === studentId ? {
            ...s,
            name: row.name ?? s.name,
            situation: row.situation ?? s.situation,
            day: row.lesson_day ?? s.day,
            hour: row.lesson_time ?? s.hour,
            enrollmentDate: row.enrollment_date || undefined,
            exitDate: row.exit_date || undefined,
            tuitionAmount: row.tuition_amount ? Number(row.tuition_amount) : s.tuitionAmount,
            instrumentId: row.instrument_id || s.instrumentId,
            instrumentName: row.instrument_id ? instruments.find(i => i.id === row.instrument_id)?.name : s.instrumentName,
            phone: row.phone || undefined,
            responsibleName: row.responsible_name || undefined,
            responsiblePhone: row.responsible_phone || undefined,
            dueDay: row.due_day ?? s.dueDay,
            paymentMethod: row.payment_method || undefined,
          } : s),
        })),
      };
    });
    markSaved();
  };

  const handleDeleteStudent = async (profId: string, studentId: string) => {
    if (!data) return;
    markSaving();
    const { error } = await apiDeleteStudent(studentId);
    if (error) { markError(); return; }
    setData((prev) => prev ? { ...prev, professors: prev.professors.map((p) => p.id === profId ? { ...p, students: p.students.filter((s) => s.id !== studentId) } : p) } : prev);
    markSaved();
  };

  const handleConfirmPayment = async (profId: string, studentId: string, month: number, amount: number) => {
    if (!data || !schoolId) return;
    const paidAt = new Date().toISOString();
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, professors: prev.professors.map((p) => p.id === profId ? { ...p, students: p.students.map((s) => s.id === studentId ? { ...s, payments: s.payments.map((pay, i) => i === month ? { amount, status: "PAID" as PaymentStatus } : pay) } : s) } : p) };
    });
    markSaving();
    const { error } = await apiUpsertPayment({ studentId, schoolId, year: data.config.year, month: month + 1, amount, status: "PAID", paidAt });
    if (error) { markError(); return; }
    markSaved();
  };

  const handleWaivePayment = async (profId: string, studentId: string, month: number) => {
    if (!data || !schoolId) return;
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, professors: prev.professors.map((p) => p.id === profId ? { ...p, students: p.students.map((s) => s.id === studentId ? { ...s, payments: s.payments.map((pay, i) => i === month ? { amount: 0, status: "WAIVED" as PaymentStatus } : pay) } : s) } : p) };
    });
    markSaving();
    const { error } = await apiUpsertPayment({ studentId, schoolId, year: data.config.year, month: month + 1, amount: 0, status: "WAIVED", paidAt: null });
    if (error) { markError(); return; }
    markSaved();
  };

  const handleRevertPayment = async (profId: string, studentId: string, month: number, expectedAmount: number) => {
    if (!data || !schoolId) return;
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, professors: prev.professors.map((p) => p.id === profId ? { ...p, students: p.students.map((s) => s.id === studentId ? { ...s, payments: s.payments.map((pay, i) => i === month ? { amount: expectedAmount, status: "PENDING" as PaymentStatus } : pay) } : s) } : p) };
    });
    markSaving();
    const { error } = await apiUpsertPayment({ studentId, schoolId, year: data.config.year, month: month + 1, amount: expectedAmount, status: "PENDING", paidAt: null });
    if (error) { markError(); return; }
    markSaved();
  };

  const handleAddCostCenter = async (d: { name: string; color: string }): Promise<string> => {
    if (!data || !schoolId) return "";
    markSaving();
    const { data: row, error } = await apiAddCostCenter(schoolId, d);
    if (error || !row) { markError(); return ""; }
    setData((prev) => prev ? { ...prev, expenses: [...prev.expenses, { id: row.id, name: row.name, color: row.color, items: [] }] } : prev);
    markSaved();
    return row.id;
  };

  const handleUpdateCostCenter = async (ccId: string, updates: { name?: string; color?: string }) => {
    if (!data) return;
    markSaving();
    const { data: row, error } = await apiUpdateCostCenter(ccId, updates);
    if (error || !row) { markError(); return; }
    setData((prev) => prev ? {
      ...prev,
      expenses: prev.expenses.map((cc) => cc.id === ccId ? { ...cc, name: row.name ?? cc.name, color: row.color ?? cc.color } : cc),
    } : prev);
    markSaved();
  };

  const handleDeleteCostCenter = async (ccId: string) => {
    if (!data) return;
    markSaving();
    const { error } = await apiDeleteCostCenter(ccId);
    if (error) { markError(); return; }
    setData((prev) => prev ? { ...prev, expenses: prev.expenses.filter((cc) => cc.id !== ccId) } : prev);
    markSaved();
  };

  const handleAddExpenseItem = async (ccId: string, d: { name: string; type: "F" | "V" }): Promise<string> => {
    if (!data) return "";
    markSaving();
    const { data: row, error } = await apiAddExpenseItem(ccId, { name: d.name, expenseType: d.type });
    if (error || !row) { markError(); return ""; }
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, expenses: prev.expenses.map((cc) => cc.id === ccId ? { ...cc, items: [...cc.items, { id: row.id, name: row.name, type: (row.expense_type === "F" ? "F" : "V") as "F" | "V", amounts: Array(12).fill(0) }] } : cc) };
    });
    markSaved();
    return row.id;
  };

  const handleUpdateExpenseItem = async (ccId: string, eiId: string, updates: { name?: string; type?: "F" | "V" }) => {
    if (!data) return;
    markSaving();
    const { data: row, error } = await apiUpdateExpenseItem(eiId, { name: updates.name, expenseType: updates.type });
    if (error || !row) { markError(); return; }
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        expenses: prev.expenses.map((cc) => cc.id === ccId ? {
          ...cc,
          items: cc.items.map((it) => it.id === eiId ? {
            ...it,
            name: row.name ?? it.name,
            type: (row.expense_type === "F" ? "F" : "V") as "F" | "V",
          } : it),
        } : cc),
      };
    });
    markSaved();
  };

  const handleDeleteExpenseItem = async (ccId: string, eiId: string) => {
    if (!data) return;
    markSaving();
    const { error } = await apiDeleteExpenseItem(eiId);
    if (error) { markError(); return; }
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, expenses: prev.expenses.map((cc) => cc.id === ccId ? { ...cc, items: cc.items.filter((it) => it.id !== eiId) } : cc) };
    });
    markSaved();
  };

  const handleUpdateExpense = async (ccId: string, eiId: string, month: number, amount: number) => {
    if (!data || !schoolId) return;
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, expenses: prev.expenses.map((cc) => cc.id === ccId ? { ...cc, items: cc.items.map((it) => it.id === eiId ? { ...it, amounts: it.amounts.map((a, i) => i === month ? amount : a) } : it) } : cc) };
    });
    markSaving();
    const { error } = await apiUpsertExpense({ expenseItemId: eiId, schoolId, year: data.config.year, month: month + 1, amount });
    if (error) { markError(); return; }
    markSaved();
  };

  const handleUpdateRevenue = async (categoryId: string, month: number, amount: number) => {
    if (!data || !schoolId) return;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        revenue: prev.revenue.map((rc) => 
          rc.id === categoryId 
            ? { ...rc, amounts: rc.amounts.map((a, i) => (i === month ? amount : a)) } 
            : rc
        )
      };
    });
    markSaving();
    const { error } = await apiUpsertRevenue({ schoolId, categoryId, year: data.config.year, month: month + 1, amount });
    if (error) { markError(); return; }
    markSaved();
  };

  const handleAddRevenueCategory = async (name: string) => {
    if (!data || !schoolId) return "";
    markSaving();
    const { data: row, error } = await apiAddRevenueCategory(schoolId, name);
    if (error || !row) { markError(); return ""; }
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        revenue: [...prev.revenue, { id: row.id, name: row.name, slug: row.slug, amounts: Array(12).fill(0) }]
      };
    });
    markSaved();
    return row.id;
  };

  const handleUpdateRevenueCategory = async (categoryId: string, name: string) => {
    if (!data) return;
    markSaving();
    const { data: row, error } = await apiUpdateRevenueCategory(categoryId, name);
    if (error || !row) { markError(); return; }
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        revenue: prev.revenue.map((rc) => rc.id === categoryId ? { ...rc, name: row.name, slug: row.slug } : rc)
      };
    });
    markSaved();
  };

  const handleDeleteRevenueCategory = async (categoryId: string) => {
    if (!data) return;
    markSaving();
    const { error } = await apiDeleteRevenueCategory(categoryId);
    if (error) { markError(); return; }
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        revenue: prev.revenue.filter((rc) => rc.id !== categoryId)
      };
    });
    markSaved();
  };

  const handleSaveBills = async (bills: PayableBill[], expenseUpdates: Array<{ ccId: string; eiId: string; month: number; delta: number }>) => {
    if (!data || !schoolId) return;
    markSaving();
    const apiRows = bills.map((b) => ({ description: b.description, expenseItemId: b.expenseItemId, billType: b.type, amount: b.amount, dueDate: b.dueDate, totalInstallments: b.totalInstallments, currentInstallment: b.currentInstallment, status: b.status, groupId: b.groupId, paidAmount: b.paidAmount, paidAt: b.paidAt, competenceMonth: b.competenceMonth, competenceYear: b.competenceYear }));
    const { data: created, error } = await apiCreateBills(schoolId, apiRows);
    if (error || !created) { markError(); return; }

    for (const eu of expenseUpdates) {
      const cc = data.expenses.find((c) => c.id === eu.ccId);
      const ei = cc?.items.find((i) => i.id === eu.eiId);
      const current = ei?.amounts?.[eu.month] || 0;
      await apiUpsertExpense({ expenseItemId: eu.eiId, schoolId, year: data.config.year, month: eu.month + 1, amount: current + eu.delta });
    }

    setData((prev) => {
      if (!prev) return prev;
      const eiMap = new Map<string, string>();
      prev.expenses.forEach((cc) => cc.items.forEach((it) => { if (it.id) eiMap.set(it.id, cc.id); }));
      const newBills: PayableBill[] = created.map((b: any) => ({ id: b.id, description: b.description, costCenterId: b.expense_item_id ? (eiMap.get(b.expense_item_id) || "") : "", expenseItemId: b.expense_item_id || "", type: (b.bill_type === "RECURRENT_FIXED" || b.bill_type === "RECURRENT_VARIABLE" ? "RECURRENT" : b.bill_type) as PayableBill["type"], amount: Number(b.amount), paidAmount: b.paid_amount != null ? Number(b.paid_amount) : undefined, dueDate: b.due_date, paidAt: b.paid_at || undefined, totalInstallments: b.total_installments || undefined, currentInstallment: b.current_installment || undefined, status: b.status, groupId: b.group_id || undefined, competenceMonth: b.competence_month ?? undefined, competenceYear: b.competence_year ?? undefined }));
      let newExpenses = prev.expenses;
      if (expenseUpdates.length > 0) {
        newExpenses = prev.expenses.map((cc) => ({ ...cc, items: cc.items.map((it) => {
          const updates = expenseUpdates.filter((eu) => eu.eiId === it.id);
          if (updates.length === 0) return it;
          const newAmounts = [...it.amounts];
          updates.forEach((eu) => { newAmounts[eu.month] = Math.max(0, newAmounts[eu.month] + eu.delta); });
          return { ...it, amounts: newAmounts };
        }) }));
      }
      return { ...prev, payableBills: [...prev.payableBills, ...newBills], expenses: newExpenses };
    });
    markSaved();
  };

  const handleToggleBillStatus = async (billId: string) => {
    if (!data) return;
    const bill = data.payableBills.find((b) => b.id === billId);
    if (!bill) return;
    const newStatus = bill.status === "PAID" ? "PENDING" : "PAID";
    const paidAt = newStatus === "PAID" ? new Date().toISOString().split("T")[0] : undefined;
    const paidAmount = newStatus === "PAID" ? bill.amount : undefined;
    setData((prev) => prev ? { ...prev, payableBills: prev.payableBills.map((b) => b.id === billId ? { ...b, status: newStatus as "PAID" | "PENDING", paidAt, paidAmount } : b) } : prev);
    markSaving();
    const updates: any = { status: newStatus };
    if (newStatus === "PAID") { updates.paidAt = paidAt; updates.paidAmount = bill.amount; }
    else { updates.paidAt = null; updates.paidAmount = null; }
    const { error } = await apiUpdateBill(billId, updates);
    if (error) { markError(); return; }
    markSaved();
  };

  const handleUpdateBill = async (billId: string, updates: Partial<PayableBill>, expenseUpdates?: Array<{ ccId: string; eiId: string; month: number; delta: number }>) => {
    if (!data || !schoolId) return;
    markSaving();
    const apiUpdates: any = {};
    if (updates.amount !== undefined) apiUpdates.amount = updates.amount;
    if (updates.dueDate !== undefined) apiUpdates.dueDate = updates.dueDate;
    if (updates.status !== undefined) apiUpdates.status = updates.status;
    if (updates.description !== undefined) apiUpdates.description = updates.description;
    if (updates.expenseItemId !== undefined) apiUpdates.expenseItemId = updates.expenseItemId;
    if (updates.type !== undefined) apiUpdates.billType = updates.type;
    if (updates.competenceMonth !== undefined) apiUpdates.competenceMonth = updates.competenceMonth;
    if (updates.competenceYear !== undefined) apiUpdates.competenceYear = updates.competenceYear;
    const { error } = await apiUpdateBill(billId, apiUpdates);
    if (error) { markError(); return; }

    if (expenseUpdates) {
      for (const eu of expenseUpdates) {
        const cc = data.expenses.find((c) => c.id === eu.ccId);
        const ei = cc?.items.find((i) => i.id === eu.eiId);
        const current = ei?.amounts?.[eu.month] || 0;
        await apiUpsertExpense({ expenseItemId: eu.eiId, schoolId, year: data.config.year, month: eu.month + 1, amount: Math.max(0, current + eu.delta) });
      }
    }

    setData((prev) => {
      if (!prev) return prev;
      let newExpenses = prev.expenses;
      if (expenseUpdates && expenseUpdates.length > 0) {
        newExpenses = prev.expenses.map((cc) => ({ ...cc, items: cc.items.map((it) => {
          const eus = expenseUpdates.filter((eu) => eu.eiId === it.id);
          if (eus.length === 0) return it;
          const newAmounts = [...it.amounts];
          eus.forEach((eu) => { newAmounts[eu.month] = Math.max(0, newAmounts[eu.month] + eu.delta); });
          return { ...it, amounts: newAmounts };
        }) }));
      }
      return { ...prev, payableBills: prev.payableBills.map((b) => b.id === billId ? { ...b, ...updates } : b), expenses: newExpenses };
    });
    markSaved();
  };

  const handleDeleteBills = async (billIds: string[], expenseUpdates: Array<{ ccId: string; eiId: string; month: number; delta: number }>) => {
    if (!data || !schoolId) return;
    markSaving();
    const { error } = await apiDeleteBills(billIds);
    if (error) { markError(); return; }

    for (const eu of expenseUpdates) {
      const cc = data.expenses.find((c) => c.id === eu.ccId);
      const ei = cc?.items.find((i) => i.id === eu.eiId);
      const current = ei?.amounts?.[eu.month] || 0;
      await apiUpsertExpense({ expenseItemId: eu.eiId, schoolId, year: data.config.year, month: eu.month + 1, amount: Math.max(0, current + eu.delta) });
    }

    setData((prev) => {
      if (!prev) return prev;
      let newExpenses = prev.expenses;
      if (expenseUpdates.length > 0) {
        newExpenses = prev.expenses.map((cc) => ({ ...cc, items: cc.items.map((it) => {
          const eus = expenseUpdates.filter((eu) => eu.eiId === it.id);
          if (eus.length === 0) return it;
          const newAmounts = [...it.amounts];
          eus.forEach((eu) => { newAmounts[eu.month] = Math.max(0, newAmounts[eu.month] + eu.delta); });
          return { ...it, amounts: newAmounts };
        }) }));
      }
      return { ...prev, payableBills: prev.payableBills.filter((b) => !billIds.includes(b.id)), expenses: newExpenses };
    });
    markSaved();
  };

  const handleAddInstrument = async (name: string): Promise<Instrument | null> => {
    if (!schoolId) return null;
    markSaving();
    const { data: row, error } = await apiAddInstrument(schoolId, name);
    if (error || !row) { markError(); return null; }
    const inst = { id: row.id, name: row.name };
    setInstruments(prev => [...prev, inst].sort((a, b) => a.name.localeCompare(b.name)));
    markSaved();
    return inst;
  };

  const handleAddProfessorInstrument = async (profId: string, instrumentId: string) => {
    if (!data) return;
    markSaving();
    const { error } = await apiAddProfInst(profId, instrumentId);
    if (error) { markError(); return; }
    const inst = instruments.find(i => i.id === instrumentId);
    if (inst) {
      setData(prev => prev ? { ...prev, professors: prev.professors.map(p => p.id === profId ? { ...p, instruments: [...p.instruments, inst] } : p) } : prev);
    }
    markSaved();
  };

  const handleRemoveProfessorInstrument = async (profId: string, instrumentId: string) => {
    if (!data) return;
    markSaving();
    const { error } = await apiRemoveProfInst(profId, instrumentId);
    if (error) { markError(); return; }
    setData(prev => prev ? { ...prev, professors: prev.professors.map(p => p.id === profId ? { ...p, instruments: p.instruments.filter(i => i.id !== instrumentId) } : p) } : prev);
    markSaved();
  };

  const handleUpdateConfig = async (key: string, value: string | number) => {
    if (!data || !schoolId) return;
    const oldYear = data.config.year;
    setData((prev) => prev ? { ...prev, config: { ...prev.config, [key]: value } } : prev);
    if (key === "schoolName" && selectedSchool) {
      setSelectedSchool({ ...selectedSchool, name: value as string });
    }
    markSaving();
    const map: Record<string, string> = { schoolName: "name", year: "year", tuition: "defaultTuition", passport: "passportFee" };
    const apiKey = map[key] || key;
    const { error } = await apiUpdateSchoolConfig(schoolId, { [apiKey]: value });
    if (error) { markError(); return; }

    if (key === "year" && typeof value === "number" && value !== oldYear) {
      await apiReplicateRecurrent(schoolId, oldYear, value);
      await fetchData();
    }

    markSaved();
  };

  const handleResetData = async () => {
    if (!schoolId) return;
    markSaving();
    const { error } = await apiResetSchoolData(schoolId);
    if (error) { markError(); return; }
    await fetchData();
    markSaved();
  };

  const refreshData = fetchData;

  // Mostrar loading screen enquanto carrega dados (evita tela preta)
  if (loading || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-primary">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-4 font-sans uppercase">MF</h1>
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <DataContext.Provider
      value={{
        data, setData, instruments, dark, setDark, page, setPage, sideCol, setSideCol,
        curMo, setCurMo, selProf, setSelProf, selPay, setSelPay,
        calcMo, saveStatus,
        handleAddProfessor, handleUpdateProfessor, handleDeleteProfessor,
        handleAddStudent, handleUpdateStudent, handleDeleteStudent,
        handleConfirmPayment, handleWaivePayment, handleRevertPayment,
        handleAddInstrument, handleAddProfessorInstrument, handleRemoveProfessorInstrument,
        handleAddCostCenter, handleUpdateCostCenter, handleDeleteCostCenter,
        handleAddExpenseItem, handleUpdateExpenseItem, handleDeleteExpenseItem, handleUpdateExpense,
        handleUpdateRevenue,
        handleSaveBills, handleUpdateBill, handleDeleteBills, handleToggleBillStatus,
        handleUpdateConfig, handleResetData, refreshData,
        viewKpis, refreshKpis,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};
