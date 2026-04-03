import type { Professor, Student } from "../types";

function getMonthEntry(professor: Professor, month: number) {
  return professor.monthlyPayroll.find((entry) => entry.month === month + 1);
}

function getWeekdayIndex(day?: string) {
  switch ((day || "").trim().toLowerCase()) {
    case "dom":
      return 0;
    case "seg":
      return 1;
    case "ter":
      return 2;
    case "qua":
      return 3;
    case "qui":
      return 4;
    case "sex":
      return 5;
    case "sab":
      return 6;
    default:
      return null;
  }
}

export function countLessonOccurrencesInMonth(year: number, month: number, day?: string) {
  const weekday = getWeekdayIndex(day);
  if (weekday === null) return 0;

  const lastDay = new Date(year, month + 1, 0).getDate();
  let count = 0;

  for (let date = 1; date <= lastDay; date += 1) {
    if (new Date(year, month, date).getDay() === weekday) {
      count += 1;
    }
  }

  return count;
}

export function getProfessorPayrollAmount(professor: Professor, year: number, month: number) {
  const monthEntry = getMonthEntry(professor, month);
  if (monthEntry) return monthEntry.amount;

  if (professor.compensationType === "hourly") {
    const activeStudents = professor.students.filter((student) => student.situation === "Ativo");
    const totalLessons = activeStudents.reduce(
      (sum, student) => sum + countLessonOccurrencesInMonth(year, month, student.day),
      0,
    );
    return totalLessons * (professor.lessonDurationMinutes / 60) * professor.hourlyRate;
  }

  return professor.students.filter((student) => student.situation === "Ativo").length * professor.costPerStudent;
}

export function getProfessorPayrollDetails(professor: Professor, year: number, month: number) {
  const monthEntry = getMonthEntry(professor, month);
  const activeStudents = professor.students.filter((student) => student.situation === "Ativo");

  if (monthEntry) {
    return {
      amount: monthEntry.amount,
      autoAmount: monthEntry.autoAmount,
      overrideAmount: monthEntry.overrideAmount,
      lessonCount: monthEntry.lessonCount,
      activeStudents: monthEntry.activeStudents,
      payrollSource: monthEntry.payrollSource,
    };
  }

  if (professor.compensationType === "hourly") {
    const lessonCount = activeStudents.reduce(
      (sum, student) => sum + countLessonOccurrencesInMonth(year, month, student.day),
      0,
    );
    const autoAmount = lessonCount * (professor.lessonDurationMinutes / 60) * professor.hourlyRate;
    return {
      amount: autoAmount,
      autoAmount,
      overrideAmount: null,
      lessonCount,
      activeStudents: activeStudents.length,
      payrollSource: "auto" as const,
    };
  }

  const autoAmount = activeStudents.length * professor.costPerStudent;
  return {
    amount: autoAmount,
    autoAmount,
    overrideAmount: null,
    lessonCount: 0,
    activeStudents: activeStudents.length,
    payrollSource: "auto" as const,
  };
}

export function getProfessorCompensationLabel(professor: Professor) {
  if (professor.compensationType === "hourly") {
    return `R$ ${professor.hourlyRate}/h · ${professor.lessonDurationMinutes} min`;
  }

  return `R$ ${professor.costPerStudent}/aluno`;
}

function getHourlyStudentBaseAmount(professor: Professor, student: Student, year: number, month: number) {
  if (student.situation !== "Ativo") return 0;
  const lessons = countLessonOccurrencesInMonth(year, month, student.day);
  return lessons * (professor.lessonDurationMinutes / 60) * professor.hourlyRate;
}

export function getProfessorStudentCostAllocation(professor: Professor, year: number, month: number) {
  const activeStudents = professor.students.filter((student) => student.situation === "Ativo");
  const payroll = getProfessorPayrollDetails(professor, year, month);

  if (professor.compensationType === "per_student") {
    return new Map(
      activeStudents.map((student) => [student.id, professor.costPerStudent]),
    );
  }

  const baseAllocations = activeStudents.map((student) => ({
    studentId: student.id,
    amount: getHourlyStudentBaseAmount(professor, student, year, month),
  }));

  const baseTotal = baseAllocations.reduce((sum, entry) => sum + entry.amount, 0);
  const targetTotal = payroll.amount;

  if (targetTotal <= 0 || activeStudents.length === 0) {
    return new Map<string, number>();
  }

  if (baseTotal <= 0) {
    const equalShare = targetTotal / activeStudents.length;
    return new Map(activeStudents.map((student) => [student.id, equalShare]));
  }

  const scale = targetTotal / baseTotal;
  return new Map(
    baseAllocations.map((entry) => [entry.studentId, entry.amount * scale]),
  );
}
