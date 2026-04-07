import type { DashboardData } from "../types";
import { MS } from "./utils";
import { getProfessorPayrollAmount } from "./professorCompensation";

export interface DashboardMonthMetrics {
  month: string;
  revenue: number;
  expectedRevenue: number;
  expenses: number;
  profit: number;
  margin: number;
  tuition: number;
  payingStudents: number;
  activeStudents: number;
  profPayroll: number;
  ticket: number;
  fixedCost: number;
  varCost: number;
  costPerStudent: number;
}

export interface CashProjection30Days {
  anchorDate: Date;
  endDate: Date;
  expectedIncoming: number;
  expectedIncomingCount: number;
  scheduledOutgoing: number;
  scheduledOutgoingCount: number;
  overdueOutgoing: number;
  overdueOutgoingCount: number;
  projectedNet: number;
}

export function getDashboardMonthMetrics(data: DashboardData, monthIndex: number): DashboardMonthMetrics {
  let tuitionRevenue = 0;
  let professorPayroll = 0;
  let expectedTuitionRevenue = 0;
  const paidPersonIds = new Set<string>();
  const activePersonIds = new Set<string>();

  data.professors.forEach((professor) => {
    professor.students.forEach((student) => {
      if (student.situation === "Ativo") {
        activePersonIds.add(student.personId || student.id);
        if (!student.tuitionExempt) {
          expectedTuitionRevenue += student.tuitionAmount ?? 0;
        }
      }

      const payment = student.payments[monthIndex];
      if (payment && payment.status === "PAID" && payment.amount > 0) {
        tuitionRevenue += payment.amount;
        paidPersonIds.add(student.personId || student.id);
      }
    });

    professorPayroll += getProfessorPayrollAmount(professor, data.config.year, monthIndex);
  });

  const extraRevenue = data.revenue.reduce((sum, category) => sum + (category.amounts?.[monthIndex] || 0), 0);
  const revenue = tuitionRevenue + extraRevenue;
  const expectedRevenue = expectedTuitionRevenue + extraRevenue;

  let expenses = professorPayroll;
  let fixedCost = professorPayroll;
  let varCost = 0;

  data.expenses.forEach((costCenter) => {
    costCenter.items.forEach((item) => {
      const amount = item.amounts?.[monthIndex] || 0;
      expenses += amount;
      if (item.type === "F") fixedCost += amount;
      else varCost += amount;
    });
  });

  const payingStudents = paidPersonIds.size;
  const activeStudents = activePersonIds.size;

  return {
    month: MS[monthIndex],
    revenue,
    expectedRevenue,
    expenses,
    profit: revenue - expenses,
    margin: revenue > 0 ? (revenue - expenses) / revenue : 0,
    tuition: tuitionRevenue,
    payingStudents,
    activeStudents,
    profPayroll: professorPayroll,
    ticket: payingStudents > 0 ? tuitionRevenue / payingStudents : 0,
    fixedCost,
    varCost,
    costPerStudent: activeStudents > 0 ? expenses / activeStudents : 0,
  };
}

function clampDayToMonth(year: number, monthIndex: number, day: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(day, 1), lastDay);
}

function getProjectionAnchorDate(year: number, currentMonth: number, referenceDate = new Date()) {
  if (referenceDate.getFullYear() === year && referenceDate.getMonth() === currentMonth) {
    return new Date(year, currentMonth, referenceDate.getDate());
  }
  return new Date(year, currentMonth, 1);
}

function isDateInRange(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

export function getCashProjection30Days(
  data: DashboardData,
  currentMonth: number,
  referenceDate = new Date()
): CashProjection30Days {
  const anchorDate = getProjectionAnchorDate(data.config.year, currentMonth, referenceDate);
  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate(), 0, 0, 0, 0);
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + 30);
  endDate.setHours(23, 59, 59, 999);

  const monthKeys: Array<{ year: number; monthIndex: number }> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= endDate) {
    monthKeys.push({ year: cursor.getFullYear(), monthIndex: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  let expectedIncoming = 0;
  let expectedIncomingCount = 0;

  data.professors.forEach((professor) => {
    professor.students.forEach((student) => {
      if (student.situation !== "Ativo") return;
      if (student.tuitionExempt) return;
      const dueDay = student.dueDay ?? 5;

      monthKeys.forEach(({ year, monthIndex }) => {
        if (year !== data.config.year) return;
        const payment = student.payments[monthIndex];
        if (payment && payment.status !== "PENDING") return;

        const dueDate = new Date(year, monthIndex, clampDayToMonth(year, monthIndex, dueDay));
        if (!isDateInRange(dueDate, start, endDate)) return;

        expectedIncoming += payment?.amount ?? student.tuitionAmount ?? 0;
        expectedIncomingCount += 1;
      });
    });
  });

  const pendingBills = data.payableBills.filter((bill) => bill.status === "PENDING");
  const scheduledBills = pendingBills.filter((bill) => {
    const dueDate = new Date(bill.dueDate + "T12:00:00");
    return isDateInRange(dueDate, start, endDate);
  });
  const overdueBills = pendingBills.filter((bill) => {
    const dueDate = new Date(bill.dueDate + "T12:00:00");
    return dueDate < start;
  });

  const scheduledOutgoing = scheduledBills.reduce((sum, bill) => sum + bill.amount, 0);
  const overdueOutgoing = overdueBills.reduce((sum, bill) => sum + bill.amount, 0);

  return {
    anchorDate: start,
    endDate,
    expectedIncoming,
    expectedIncomingCount,
    scheduledOutgoing,
    scheduledOutgoingCount: scheduledBills.length,
    overdueOutgoing,
    overdueOutgoingCount: overdueBills.length,
    projectedNet: expectedIncoming - scheduledOutgoing,
  };
}
