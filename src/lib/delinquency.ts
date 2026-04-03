import type { Professor, Student } from "../types";

export interface DelinquentStudentSummary {
  student: Student;
  professorName: string;
  lateMonths: number[];
  totalOwed: number;
}

export interface DelinquencySummary {
  students: DelinquentStudentSummary[];
  totalDelinquent: number;
  totalOwed: number;
  currentMonthDelinquent: number;
}

function isMonthLate(month: number, dueDay: number, year: number, referenceDate: Date) {
  const currentActualMonth = referenceDate.getMonth();
  const currentActualDay = referenceDate.getDate();
  const currentActualYear = referenceDate.getFullYear();

  if (year < currentActualYear) return true;
  if (year > currentActualYear) return false;
  if (month < currentActualMonth) return true;
  if (month > currentActualMonth) return false;
  return currentActualDay > dueDay;
}

export function getDelinquencySummary(params: {
  professors: Professor[];
  currentMonth: number;
  year: number;
  referenceDate?: Date;
}): DelinquencySummary {
  const { professors, currentMonth, year, referenceDate = new Date() } = params;
  const seen = new Set<string>();
  const students: DelinquentStudentSummary[] = [];
  let currentMonthDelinquent = 0;

  professors.forEach((professor) => {
    professor.students.forEach((student) => {
      if (student.situation !== "Ativo") return;
      const key = student.personId || student.id;
      if (seen.has(key)) return;
      seen.add(key);

      const dueDay = student.dueDay ?? 5;
      const lateMonths: number[] = [];
      let totalOwed = 0;

      for (let month = 0; month <= currentMonth; month++) {
        const payment = student.payments[month];
        const isPending = !payment || payment.status === "PENDING";
        if (!isPending) continue;
        if (!isMonthLate(month, dueDay, year, referenceDate)) continue;

        lateMonths.push(month);
        totalOwed += payment?.amount ?? student.tuitionAmount ?? 0;
      }

      if (lateMonths.length === 0) return;
      if (lateMonths.includes(currentMonth)) currentMonthDelinquent += 1;

      students.push({
        student,
        professorName: professor.name,
        lateMonths,
        totalOwed,
      });
    });
  });

  students.sort((a, b) => b.lateMonths.length - a.lateMonths.length || b.totalOwed - a.totalOwed);

  return {
    students,
    totalDelinquent: students.length,
    totalOwed: students.reduce((sum, item) => sum + item.totalOwed, 0),
    currentMonthDelinquent,
  };
}
