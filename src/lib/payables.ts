import type { ExpenseAllocationUpdate, PayableBill } from "../types";

export function getDateMonthIndex(date: string) {
  return new Date(date + "T12:00:00").getMonth();
}

export function getDateYear(date: string) {
  return new Date(date + "T12:00:00").getFullYear();
}

export function getBillCompetence(
  bill: Pick<PayableBill, "dueDate" | "competenceMonth" | "competenceYear">,
  fallbackYear: number
) {
  return {
    month: bill.competenceMonth ?? getDateMonthIndex(bill.dueDate),
    year: bill.competenceYear ?? getDateYear(bill.dueDate) ?? fallbackYear,
  };
}

export function isBillInCompetenceMonth(
  bill: Pick<PayableBill, "dueDate" | "competenceMonth" | "competenceYear">,
  month: number,
  year: number
) {
  const competence = getBillCompetence(bill, year);
  return competence.month === month && competence.year === year;
}

export function createExpenseAllocationUpdate(
  bill: Pick<PayableBill, "costCenterId" | "expenseItemId" | "dueDate" | "competenceMonth" | "competenceYear" | "amount">,
  delta: number,
  fallbackYear: number
): ExpenseAllocationUpdate | null {
  if (!bill.costCenterId || !bill.expenseItemId) return null;
  const competence = getBillCompetence(bill, fallbackYear);
  return {
    ccId: bill.costCenterId,
    eiId: bill.expenseItemId,
    month: competence.month,
    year: competence.year,
    delta,
  };
}
