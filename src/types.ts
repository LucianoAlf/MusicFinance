export type PaymentStatus = "PAID" | "PENDING" | "WAIVED";
export type DisplayStatus = "PAID" | "PENDING" | "LATE" | "WAIVED" | "FUTURE";

export interface Payment {
  amount: number;
  status: PaymentStatus;
}

export interface Instrument {
  id: string;
  name: string;
}

export type ProfessorCompensationType = "per_student" | "hourly";
export type ProfessorPayrollSource = "auto" | "override";

export interface ProfessorMonthlyPayroll {
  year: number;
  month: number;
  amount: number;
  autoAmount: number;
  overrideAmount: number | null;
  lessonCount: number;
  activeStudents: number;
  payrollSource: ProfessorPayrollSource;
  notes?: string;
}

export interface Student {
  id: string;
  personId: string;
  name: string;
  situation: string;
  hour: string;
  day: string;
  payments: (Payment | null)[];
  enrollmentDate?: string;
  exitDate?: string;
  tuitionAmount?: number;
  instrumentId?: string;
  instrumentName?: string;
  phone?: string;
  responsibleName?: string;
  responsiblePhone?: string;
  dueDay?: number;
  paymentMethod?: string;
}

export interface Professor {
  id: string;
  name: string;
  instrument: string;
  compensationType: ProfessorCompensationType;
  costPerStudent: number;
  hourlyRate: number;
  lessonDurationMinutes: number;
  avatarUrl?: string;
  instruments: Instrument[];
  students: Student[];
  monthlyPayroll: ProfessorMonthlyPayroll[];
}

export interface ExpenseItem {
  id?: string;
  name: string;
  type: 'F' | 'V';
  amounts: number[];
}

export interface CostCenter {
  id: string;
  name: string;
  color: string;
  items: ExpenseItem[];
  cc?: number;
}

export interface RevenueCategory {
  id: string;
  name: string;
  slug: string;
  amounts: number[];
}

export interface Config {
  schoolName: string;
  year: number;
  tuition: number;
  passport: number;
}

export interface PayableBill {
  id: string;
  description: string;
  costCenterId: string;
  expenseItemId: string;
  type: 'UNIQUE' | 'RECURRENT' | 'INSTALLMENT';
  amount: number;
  paidAmount?: number;
  dueDate: string;
  paidAt?: string;
  totalInstallments?: number;
  currentInstallment?: number;
  status: 'PENDING' | 'PAID';
  groupId?: string;
  competenceMonth?: number;
  competenceYear?: number;
}

export interface ExpenseAllocationUpdate {
  ccId: string;
  eiId: string;
  month: number;
  year: number;
  delta: number;
}

export interface DashboardData {
  config: Config;
  professors: Professor[];
  expenses: CostCenter[];
  revenue: RevenueCategory[];
  payableBills: PayableBill[];
}

export interface MonthlyKpi {
  month: number;
  tuitionRevenue: number;
  payingStudents: number;
  activeStudents: number;
  newEnrollments: number;
  churnedStudents: number;
  professorPayroll: number;
  churnRate: number;
}

export interface BreakevenData {
  month: number;
  fixedCosts: number;
  variableCosts: number;
  revenue: number;
  breakevenRevenue: number | null;
}

export interface ViewKpis {
  monthly: MonthlyKpi[];
  breakeven: BreakevenData[];
  avgTenureMonths: number;
}
