import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { DashboardData, PayableBill, ViewKpis } from "../types";
import { useAuth } from "./AuthContext";
import { MS } from "../lib/utils";
import {
  loadSchoolData,
  loadMonthlyKpis,
  loadBreakeven,
  loadAvgTenure,
  addProfessor as apiAddProfessor,
  deleteProfessor as apiDeleteProfessor,
  addStudent as apiAddStudent,
  deleteStudent as apiDeleteStudent,
  upsertPayment as apiUpsertPayment,
  addCostCenter as apiAddCostCenter,
  deleteCostCenter as apiDeleteCostCenter,
  addExpenseItem as apiAddExpenseItem,
  deleteExpenseItem as apiDeleteExpenseItem,
  upsertExpense as apiUpsertExpense,
  upsertRevenue as apiUpsertRevenue,
  createBills as apiCreateBills,
  updateBill as apiUpdateBill,
  deleteBills as apiDeleteBills,
  updateSchoolConfig as apiUpdateSchoolConfig,
  resetSchoolData as apiResetSchoolData,
  type SlugMap,
} from "../lib/supabaseData";

type SaveStatus = "saving" | "saved" | "idle" | "error";

interface DataContextType {
  data: DashboardData | null;
  setData: React.Dispatch<React.SetStateAction<DashboardData | null>>;
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
  handleAddProfessor: (d: { name: string; instrument: string; costPerStudent: number }) => Promise<void>;
  handleDeleteProfessor: (profId: string) => Promise<void>;
  handleAddStudent: (profId: string, d: { name: string; day: string; time: string; tuition?: number }) => Promise<void>;
  handleDeleteStudent: (profId: string, studentId: string) => Promise<void>;
  handleUpdatePayment: (profId: string, studentId: string, month: number, value: string) => Promise<void>;
  handleAddCostCenter: (d: { name: string; color: string }) => Promise<string>;
  handleDeleteCostCenter: (ccId: string) => Promise<void>;
  handleAddExpenseItem: (ccId: string, d: { name: string; type: "F" | "V" }) => Promise<string>;
  handleDeleteExpenseItem: (ccId: string, eiId: string) => Promise<void>;
  handleUpdateExpense: (ccId: string, eiId: string, month: number, amount: number) => Promise<void>;
  handleUpdateRevenue: (slug: string, month: number, amount: number) => Promise<void>;
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
  const { selectedSchool } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(false);
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
    let tui = 0, pp = 0, ps = 0;
    (data.professors || []).forEach((p) => {
      let pay = 0;
      (p.students || []).forEach((s) => {
        const v = s.payments && s.payments[m];
        if (v && v > 0) { tui += v; pay++; ps++; }
      });
      pp += pay * p.costPerStudent;
    });
    const rv = data.revenue || {} as any;
    const rev = tui + (rv.enrollments?.[m] || 0) + (rv.shop?.[m] || 0) + (rv.events?.[m] || 0) + (rv.interest?.[m] || 0) + (rv.other?.[m] || 0);
    let exp = pp, fc = 0, vc = pp;
    (data.expenses || []).forEach((cc) =>
      (cc.items || []).forEach((it) => { const a = it.amounts?.[m] || 0; exp += a; if (it.type === "F") fc += a; else vc += a; })
    );
    return { month: MS[m], revenue: rev, expenses: exp, profit: rev - exp, margin: rev > 0 ? (rev - exp) / rev : 0, tuition: tui, payingStudents: ps, profPayroll: pp, ticket: ps > 0 ? tui / ps : 0, fixedCost: fc, varCost: vc, costPerStudent: ps > 0 ? exp / ps : 0 };
  };

  // ─── Write handlers ────────────────────────────────────────────────────

  const handleAddProfessor = async (d: { name: string; instrument: string; costPerStudent: number }) => {
    if (!data || !schoolId) return;
    markSaving();
    const { data: row, error } = await apiAddProfessor(schoolId, d);
    if (error || !row) { markError(); return; }
    setData((prev) => prev ? { ...prev, professors: [...prev.professors, { id: row.id, name: row.name, instrument: row.instrument || "", costPerStudent: Number(row.cost_per_student), students: [] }] } : prev);
    setSelProf(row.id);
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

  const handleAddStudent = async (profId: string, d: { name: string; day: string; time: string; tuition?: number }) => {
    if (!data || !schoolId) return;
    markSaving();
    const tuitionVal = d.tuition || data.config.tuition;
    const { data: row, error } = await apiAddStudent(schoolId, { professorId: profId, name: d.name, day: d.day, time: d.time, tuition: tuitionVal });
    if (error || !row) { markError(); return; }

    const payments12 = Array(12).fill(tuitionVal);
    const paymentInserts = [];
    for (let m = 0; m < 12; m++) {
      paymentInserts.push({ studentId: row.id, schoolId, year: data.config.year, month: m + 1, amount: tuitionVal, status: "PAID" });
    }
    for (const pi of paymentInserts) await apiUpsertPayment(pi);

    const newStudent = { id: row.id, name: row.name, situation: "Ativo", hour: row.lesson_time || "", day: row.lesson_day || "", payments: payments12, enrollmentDate: row.enrollment_date || undefined, tuitionAmount: tuitionVal };
    setData((prev) => prev ? { ...prev, professors: prev.professors.map((p) => p.id === profId ? { ...p, students: [...p.students, newStudent] } : p) } : prev);
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

  const handleUpdatePayment = async (profId: string, studentId: string, month: number, value: string) => {
    if (!data || !schoolId) return;
    const numVal = value === "" ? null : Number(value);
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, professors: prev.professors.map((p) => p.id === profId ? { ...p, students: p.students.map((s) => s.id === studentId ? { ...s, payments: s.payments.map((pay, i) => i === month ? numVal : pay) } : s) } : p) };
    });
    markSaving();
    const status = numVal === null || numVal === 0 ? "PENDING" : "PAID";
    const { error } = await apiUpsertPayment({ studentId, schoolId, year: data.config.year, month: month + 1, amount: numVal, status });
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

  const handleUpdateRevenue = async (slug: string, month: number, amount: number) => {
    if (!data || !schoolId) return;
    const catId = slugMapRef.current[slug];
    if (!catId) return;
    setData((prev) => {
      if (!prev) return prev;
      const key = slug as keyof typeof prev.revenue;
      if (!(key in prev.revenue)) return prev;
      const newArr = [...prev.revenue[key]];
      newArr[month] = amount;
      return { ...prev, revenue: { ...prev.revenue, [key]: newArr } };
    });
    markSaving();
    const { error } = await apiUpsertRevenue({ schoolId, categoryId: catId, year: data.config.year, month: month + 1, amount });
    if (error) { markError(); return; }
    markSaved();
  };

  const handleSaveBills = async (bills: PayableBill[], expenseUpdates: Array<{ ccId: string; eiId: string; month: number; delta: number }>) => {
    if (!data || !schoolId) return;
    markSaving();
    const apiRows = bills.map((b) => ({ description: b.description, expenseItemId: b.expenseItemId, billType: b.type, amount: b.amount, dueDate: b.dueDate, totalInstallments: b.totalInstallments, currentInstallment: b.currentInstallment, status: b.status, groupId: b.groupId }));
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
      const newBills: PayableBill[] = created.map((b: any) => ({ id: b.id, description: b.description, costCenterId: b.expense_item_id ? (eiMap.get(b.expense_item_id) || "") : "", expenseItemId: b.expense_item_id || "", type: b.bill_type, amount: Number(b.amount), paidAmount: b.paid_amount != null ? Number(b.paid_amount) : undefined, dueDate: b.due_date, paidAt: b.paid_at || undefined, totalInstallments: b.total_installments || undefined, currentInstallment: b.current_installment || undefined, status: b.status, groupId: b.group_id || undefined }));
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
    setData((prev) => prev ? { ...prev, payableBills: prev.payableBills.map((b) => b.id === billId ? { ...b, status: newStatus as "PAID" | "PENDING" } : b) } : prev);
    markSaving();
    const { error } = await apiUpdateBill(billId, { status: newStatus });
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

  const handleUpdateConfig = async (key: string, value: string | number) => {
    if (!data || !schoolId) return;
    setData((prev) => prev ? { ...prev, config: { ...prev.config, [key]: value } } : prev);
    markSaving();
    const map: Record<string, string> = { schoolName: "name", year: "year", tuition: "defaultTuition", passport: "passportFee" };
    const apiKey = map[key] || key;
    const { error } = await apiUpdateSchoolConfig(schoolId, { [apiKey]: value });
    if (error) { markError(); return; }
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

  if (loading || !data) return null;

  return (
    <DataContext.Provider
      value={{
        data, setData, dark, setDark, page, setPage, sideCol, setSideCol,
        curMo, setCurMo, selProf, setSelProf, selPay, setSelPay,
        calcMo, saveStatus,
        handleAddProfessor, handleDeleteProfessor,
        handleAddStudent, handleDeleteStudent, handleUpdatePayment,
        handleAddCostCenter, handleDeleteCostCenter,
        handleAddExpenseItem, handleDeleteExpenseItem, handleUpdateExpense,
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
