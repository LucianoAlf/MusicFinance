export type PaymentArray = (number | null)[];

export interface Student {
  id: string;
  name: string;
  situation: string;
  hour: string;
  day: string;
  payments: PaymentArray;
}

export interface Professor {
  id: string;
  name: string;
  instrument: string;
  costPerStudent: number;
  students: Student[];
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

export interface Revenue {
  enrollments: number[];
  shop: number[];
  events: number[];
  interest: number[];
  other: number[];
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
  type: 'UNIQUE' | 'RECURRENT_FIXED' | 'RECURRENT_VARIABLE' | 'INSTALLMENT';
  amount: number;
  dueDate: string; // YYYY-MM-DD
  totalInstallments?: number;
  currentInstallment?: number;
  status: 'PENDING' | 'PAID';
  groupId?: string;
}

export interface DashboardData {
  config: Config;
  professors: Professor[];
  expenses: CostCenter[];
  revenue: Revenue;
  payableBills: PayableBill[];
}


