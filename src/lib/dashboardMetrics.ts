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
        expectedTuitionRevenue += student.tuitionAmount || 0;
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
