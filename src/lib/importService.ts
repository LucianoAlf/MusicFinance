import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "./supabase";
import type { Professor, Instrument } from "../types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RawRow {
  professor: string;
  instrumentoProf: string;
  custoAluno: string;
  nomeAluno: string;
  curso: string;
  situacao: string;
  dia: string;
  horario: string;
  mensalidade: string;
  pagou: string;
  dataPgto: string;
  dataMatricula: string;
  dataSaida: string;
}

export interface ParsedRow {
  professorName: string;
  professorInstruments: string[];
  costPerStudent: number | null;
  studentName: string;
  course: string;
  situation: string;
  lessonDay: string;
  lessonTime: string;
  tuitionAmount: number | null;
  paidAmount: number;
  paidAt: string | null;
  enrollmentDate: string | null;
  exitDate: string | null;
}

export interface SnapshotProfessor {
  name: string;
  instruments: string[];
  costPerStudent: number | null;
  students: SnapshotStudent[];
}

export interface SnapshotStudent {
  name: string;
  professorName: string;
  course: string;
  situation: string;
  lessonDay: string;
  lessonTime: string;
  tuitionAmount: number | null;
  paidAmount: number;
  paidAt: string | null;
  enrollmentDate: string | null;
  exitDate: string | null;
}

export type ActionType =
  | "CREATE_PROFESSOR"
  | "UPDATE_PROFESSOR"
  | "ADD_PROFESSOR_INSTRUMENT"
  | "DEACTIVATE_PROFESSOR"
  | "CREATE_STUDENT"
  | "UPDATE_SITUATION"
  | "UPDATE_TUITION"
  | "UPDATE_COURSE"
  | "UPDATE_SCHEDULE"
  | "TRANSFER_STUDENT"
  | "CONFIRM_PAYMENT"
  | "PENDING_PAYMENT"
  | "POSSIBLE_CHURN";

export interface ImportAction {
  type: ActionType;
  label: string;
  enabled: boolean;
  data?: any;
  churnChoice?: "Evadido" | "Trancado" | "ignore";
}

export interface ImportSummary {
  actions: ImportAction[];
  professorsCreated: number;
  studentsCreated: number;
  studentsChurned: number;
  paymentsConfirmed: number;
  tuitionChanges: number;
  transfers: number;
}

export interface ImportHistoryEntry {
  id: string;
  year: number;
  month: number;
  professors_created: number;
  students_created: number;
  students_churned: number;
  payments_confirmed: number;
  tuition_changes: number;
  transfers: number;
  file_name: string | null;
  imported_at: string;
}

// ─── Column header mappings (flexible matching) ─────────────────────────────

const HEADER_MAP: Record<string, keyof RawRow> = {
  professor: "professor",
  "nome professor": "professor",
  "nome do professor": "professor",
  "instrumento prof": "instrumentoProf",
  "instrumentos professor": "instrumentoProf",
  "instrumento do professor": "instrumentoProf",
  "instrumento professor": "instrumentoProf",
  instrumentos: "instrumentoProf",
  "custo aluno": "custoAluno",
  "custo por aluno": "custoAluno",
  custo: "custoAluno",
  "nome aluno": "nomeAluno",
  "nome do aluno": "nomeAluno",
  aluno: "nomeAluno",
  curso: "curso",
  instrumento: "curso",
  "instrumento aluno": "curso",
  situacao: "situacao",
  "situação": "situacao",
  status: "situacao",
  dia: "dia",
  "dia aula": "dia",
  horario: "horario",
  "horário": "horario",
  hora: "horario",
  mensalidade: "mensalidade",
  "valor mensalidade": "mensalidade",
  valor: "mensalidade",
  pagou: "pagou",
  "valor pago": "pagou",
  pago: "pagou",
  "data pgto": "dataPgto",
  "data pagamento": "dataPgto",
  "dt pgto": "dataPgto",
  "data pago": "dataPgto",
  "data matricula": "dataMatricula",
  "data matrícula": "dataMatricula",
  "matricula": "dataMatricula",
  "data entrada": "dataMatricula",
  "data saida": "dataSaida",
  "data saída": "dataSaida",
  "saida": "dataSaida",
};

// ─── Normalization helpers ──────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normalizeAmount(val: string): number {
  if (!val || val.trim() === "") return 0;
  const cleaned = val
    .replace(/[rR]\$\s*/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
    .trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function normalizeAmountOrNull(val: string): number | null {
  if (!val || val.trim() === "") return null;
  return normalizeAmount(val);
}

const SITUATION_MAP: Record<string, string> = {
  ativo: "Ativo",
  a: "Ativo",
  active: "Ativo",
  evadido: "Evadido",
  e: "Evadido",
  desistente: "Evadido",
  desistiu: "Evadido",
  trancado: "Trancado",
  t: "Trancado",
  inativo: "Trancado",
  i: "Trancado",
  cancelado: "Trancado",
};

function normalizeSituation(val: string): string {
  if (!val || val.trim() === "") return "Ativo";
  const key = val.trim().toLowerCase();
  return SITUATION_MAP[key] || "Ativo";
}

const DAY_MAP: Record<string, string> = {
  seg: "Seg", segunda: "Seg", "segunda-feira": "Seg", mon: "Seg", monday: "Seg",
  ter: "Ter", terca: "Ter", "terça": "Ter", "terca-feira": "Ter", "terça-feira": "Ter", tue: "Ter",
  qua: "Qua", quarta: "Qua", "quarta-feira": "Qua", wed: "Qua",
  qui: "Qui", quinta: "Qui", "quinta-feira": "Qui", thu: "Qui",
  sex: "Sex", sexta: "Sex", "sexta-feira": "Sex", fri: "Sex",
  sab: "Sab", "sáb": "Sab", sabado: "Sab", "sábado": "Sab", sat: "Sab",
  dom: "Dom", domingo: "Dom", sun: "Dom",
};

function normalizeDay(val: string): string {
  if (!val || val.trim() === "") return "";
  return DAY_MAP[val.trim().toLowerCase()] || val.trim();
}

function normalizeTime(val: string): string {
  if (!val || val.trim() === "") return "";
  let t = val.trim().replace(/h/gi, ":").replace(/:+$/, "");
  if (/^\d{1,2}$/.test(t)) t += ":00";
  if (/^\d{1,2}:\d{1}$/.test(t)) t += "0";
  return t;
}

function normalizeDate(val: string, year: number, month: number): string | null {
  if (!val || val.trim() === "") return null;
  const v = val.trim();
  const formats = [
    /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/,
    /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/,
  ];
  for (const fmt of formats) {
    const m = v.match(fmt);
    if (m) {
      if (fmt === formats[0]) {
        const d = parseInt(m[1]), mo = parseInt(m[2]);
        let y = parseInt(m[3]);
        if (y < 100) y += 2000;
        return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      } else {
        return `${m[1]}-${String(parseInt(m[2])).padStart(2, "0")}-${String(parseInt(m[3])).padStart(2, "0")}`;
      }
    }
  }
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function normalizeInstruments(val: string): string[] {
  if (!val || val.trim() === "") return [];
  return [...new Set(
    val.split(/[,;/]/).map((s) => normalizeName(s)).filter(Boolean)
  )];
}

// ─── Parse file ─────────────────────────────────────────────────────────────

export function parseFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => resolve(result.data as Record<string, string>[]),
        error: (err) => reject(err),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false });
        resolve(json);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error("Formato nao suportado. Use .csv, .xlsx ou .xls"));
    }
  });
}

// ─── Map headers ────────────────────────────────────────────────────────────

export function mapHeaders(rawData: Record<string, string>[]): RawRow[] {
  if (rawData.length === 0) return [];

  const sampleKeys = Object.keys(rawData[0]);
  const mapping: Record<string, string> = {};

  for (const key of sampleKeys) {
    const normalized = key.toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const match = HEADER_MAP[normalized];
    if (match) mapping[key] = match;
  }

  return rawData
    .map((row) => {
      const mapped: any = {};
      for (const [origKey, targetKey] of Object.entries(mapping)) {
        mapped[targetKey] = row[origKey] || "";
      }
      return mapped as RawRow;
    })
    .filter((r) => r.professor || r.nomeAluno);
}

// ─── Normalize rows ─────────────────────────────────────────────────────────

export function normalizeRows(rows: RawRow[], year: number, month: number): ParsedRow[] {
  return rows.map((r) => ({
    professorName: normalizeName(r.professor || ""),
    professorInstruments: normalizeInstruments(r.instrumentoProf || ""),
    costPerStudent: normalizeAmountOrNull(r.custoAluno || ""),
    studentName: normalizeName(r.nomeAluno || ""),
    course: normalizeName(r.curso || ""),
    situation: normalizeSituation(r.situacao || ""),
    lessonDay: normalizeDay(r.dia || ""),
    lessonTime: normalizeTime(r.horario || ""),
    tuitionAmount: normalizeAmountOrNull(r.mensalidade || ""),
    paidAmount: normalizeAmount(r.pagou || ""),
    paidAt: normalizeDate(r.dataPgto || "", year, month),
    enrollmentDate: normalizeDate(r.dataMatricula || "", year, month),
    exitDate: normalizeDate(r.dataSaida || "", year, month),
  }));
}

// ─── Group into snapshot ────────────────────────────────────────────────────

export function buildSnapshot(rows: ParsedRow[]): SnapshotProfessor[] {
  const profMap = new Map<string, SnapshotProfessor>();

  for (const r of rows) {
    if (!r.professorName) continue;
    const key = r.professorName.toLowerCase();
    let prof = profMap.get(key);
    if (!prof) {
      prof = {
        name: r.professorName,
        instruments: r.professorInstruments,
        costPerStudent: r.costPerStudent,
        students: [],
      };
      profMap.set(key, prof);
    } else {
      if (r.professorInstruments.length > 0) {
        const existing = new Set(prof.instruments.map((i) => i.toLowerCase()));
        for (const inst of r.professorInstruments) {
          if (!existing.has(inst.toLowerCase())) {
            prof.instruments.push(inst);
            existing.add(inst.toLowerCase());
          }
        }
      }
      if (r.costPerStudent != null && prof.costPerStudent == null) {
        prof.costPerStudent = r.costPerStudent;
      }
    }

    if (r.studentName) {
      prof.students.push({
        name: r.studentName,
        professorName: r.professorName,
        course: r.course || (prof.instruments[0] || ""),
        situation: r.situation,
        lessonDay: r.lessonDay,
        lessonTime: r.lessonTime,
        tuitionAmount: r.tuitionAmount,
        paidAmount: r.paidAmount,
        paidAt: r.paidAt,
        enrollmentDate: r.enrollmentDate,
        exitDate: r.exitDate,
      });
    }
  }

  return Array.from(profMap.values());
}

// ─── Diff logic ─────────────────────────────────────────────────────────────

export interface ExistingData {
  professors: Professor[];
  instruments: Instrument[];
  schoolId: string;
  year: number;
  defaultTuition: number;
}

function nameMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function computeDiff(
  snapshot: SnapshotProfessor[],
  existing: ExistingData,
  month: number
): ImportAction[] {
  const actions: ImportAction[] = [];
  const { professors: existProfs, instruments: existInsts, year, defaultTuition } = existing;

  // Flatten all snapshot students for person_id grouping
  const allSnapshotStudents = snapshot.flatMap((sp) => sp.students);
  const studentNameGroups = new Map<string, SnapshotStudent[]>();
  for (const ss of allSnapshotStudents) {
    const key = ss.name.toLowerCase();
    if (!studentNameGroups.has(key)) studentNameGroups.set(key, []);
    studentNameGroups.get(key)!.push(ss);
  }

  // --- Professor diff ---
  for (const sp of snapshot) {
    const ep = existProfs.find((p) => nameMatch(p.name, sp.name));
    if (!ep) {
      actions.push({
        type: "CREATE_PROFESSOR",
        label: `Novo professor: ${sp.name} (${sp.instruments.join(", ") || "sem instrumento"}) — Custo: R$ ${sp.costPerStudent ?? defaultTuition}`,
        enabled: true,
        data: { ...sp, costPerStudent: sp.costPerStudent ?? defaultTuition },
      });
    } else {
      if (sp.costPerStudent != null && sp.costPerStudent !== ep.costPerStudent) {
        actions.push({
          type: "UPDATE_PROFESSOR",
          label: `${sp.name}: custo R$ ${ep.costPerStudent} → R$ ${sp.costPerStudent}`,
          enabled: true,
          data: { professorId: ep.id, costPerStudent: sp.costPerStudent },
        });
      }
      for (const instName of sp.instruments) {
        if (!ep.instruments.some((i) => nameMatch(i.name, instName))) {
          const existInst = existInsts.find((i) => nameMatch(i.name, instName));
          actions.push({
            type: "ADD_PROFESSOR_INSTRUMENT",
            label: `${sp.name}: + instrumento ${instName}`,
            enabled: true,
            data: { professorId: ep.id, instrumentName: instName, instrumentId: existInst?.id },
          });
        }
      }
    }
  }

  // Professors in DB not in snapshot
  for (const ep of existProfs) {
    if (!snapshot.some((sp) => nameMatch(sp.name, ep.name))) {
      actions.push({
        type: "DEACTIVATE_PROFESSOR",
        label: `${ep.name}: nao aparece na planilha — desativar?`,
        enabled: false,
        data: { professorId: ep.id },
      });
    }
  }

  // --- Student diff ---
  const allExistStudents = existProfs.flatMap((p) =>
    p.students.map((s) => ({ ...s, professorName: p.name, professorId: p.id }))
  );

  for (const sp of snapshot) {
    const ep = existProfs.find((p) => nameMatch(p.name, sp.name));

    for (const ss of sp.students) {
      const existStudent = allExistStudents.find(
        (es) =>
          nameMatch(es.name, ss.name) &&
          nameMatch(es.professorName, ss.professorName)
      );

      if (!existStudent) {
        // Check transfer: same name, different professor
        const sameNameOtherProf = allExistStudents.find(
          (es) =>
            nameMatch(es.name, ss.name) &&
            !nameMatch(es.professorName, ss.professorName) &&
            es.situation === "Ativo"
        );

        if (sameNameOtherProf) {
          actions.push({
            type: "TRANSFER_STUDENT",
            label: `${ss.name}: transferencia de ${sameNameOtherProf.professorName} → ${ss.professorName}`,
            enabled: true,
            data: {
              studentId: sameNameOtherProf.id,
              fromProfId: sameNameOtherProf.professorId,
              toProfId: ep?.id,
              toProfName: ss.professorName,
            },
          });
        } else {
          // Check if multi-course (same person, different professors in snapshot)
          const multiCourseEntries = studentNameGroups.get(ss.name.toLowerCase()) || [];
          const isMultiCourse = multiCourseEntries.length > 1;

          // Check if person already exists in DB
          const existingPerson = allExistStudents.find((es) => nameMatch(es.name, ss.name));

          actions.push({
            type: "CREATE_STUDENT",
            label: `${ss.name}: matricula nova (${ss.professorName} — ${ss.course || "?"})${isMultiCourse ? " [multi-curso]" : ""}`,
            enabled: true,
            data: {
              ...ss,
              professorId: ep?.id,
              professorName: ss.professorName,
              enrollmentDate: ss.enrollmentDate || `${year}-${String(month).padStart(2, "0")}-01`,
              personId: existingPerson?.personId || null,
              isMultiCourse,
            },
          });
        }
      } else {
        // Situation change
        if (ss.situation && ss.situation !== existStudent.situation) {
          actions.push({
            type: "UPDATE_SITUATION",
            label: `${ss.name}: ${existStudent.situation} → ${ss.situation}`,
            enabled: true,
            data: {
              studentId: existStudent.id,
              oldSituation: existStudent.situation,
              newSituation: ss.situation,
            },
          });
        }

        // Tuition change
        if (ss.tuitionAmount != null && ss.tuitionAmount !== (existStudent.tuitionAmount || 0)) {
          actions.push({
            type: "UPDATE_TUITION",
            label: `${ss.name}: mensalidade R$ ${existStudent.tuitionAmount || 0} → R$ ${ss.tuitionAmount}`,
            enabled: true,
            data: {
              studentId: existStudent.id,
              newAmount: ss.tuitionAmount,
              oldAmount: existStudent.tuitionAmount || 0,
            },
          });
        }

        // Course change
        if (ss.course && existStudent.instrumentName && !nameMatch(ss.course, existStudent.instrumentName)) {
          actions.push({
            type: "UPDATE_COURSE",
            label: `${ss.name}: curso ${existStudent.instrumentName} → ${ss.course}`,
            enabled: true,
            data: {
              studentId: existStudent.id,
              newCourse: ss.course,
              oldCourse: existStudent.instrumentName,
            },
          });
        }

        // Schedule change
        if (ss.lessonDay && ss.lessonDay !== existStudent.day) {
          actions.push({
            type: "UPDATE_SCHEDULE",
            label: `${ss.name}: horario ${existStudent.day} ${existStudent.hour} → ${ss.lessonDay} ${ss.lessonTime}`,
            enabled: true,
            data: {
              studentId: existStudent.id,
              day: ss.lessonDay,
              time: ss.lessonTime,
            },
          });
        }

        // Payment
        if (ss.paidAmount > 0) {
          actions.push({
            type: "CONFIRM_PAYMENT",
            label: `${ss.name}: pagou R$ ${ss.paidAmount} em ${month}/${year}`,
            enabled: true,
            data: {
              studentId: existStudent.id,
              year,
              month,
              amount: ss.paidAmount,
              paidAt: ss.paidAt || `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`,
            },
          });
        }
      }
    }
  }

  // Active students in DB not in snapshot -> possible churn
  for (const es of allExistStudents) {
    if (es.situation !== "Ativo") continue;
    const inSnapshot = allSnapshotStudents.some(
      (ss) => nameMatch(ss.name, es.name)
    );
    if (!inSnapshot) {
      actions.push({
        type: "POSSIBLE_CHURN",
        label: `${es.name} (${es.professorName}): nao aparece na planilha — evasao?`,
        enabled: false,
        churnChoice: "Evadido",
        data: { studentId: es.id, professorName: es.professorName },
      });
    }
  }

  return actions;
}

// ─── Execute actions ────────────────────────────────────────────────────────

export async function executeActions(
  actions: ImportAction[],
  schoolId: string,
  year: number,
  month: number,
  defaultTuition: number,
  existingInstruments: Instrument[],
  onProgress?: (done: number, total: number) => void
): Promise<{ success: boolean; error?: string; stats: { professorsCreated: number; studentsCreated: number; studentsChurned: number; paymentsConfirmed: number; tuitionChanges: number; transfers: number } }> {
  const enabled = actions.filter((a) => a.enabled);
  const total = enabled.length;
  let done = 0;
  const stats = { professorsCreated: 0, studentsCreated: 0, studentsChurned: 0, paymentsConfirmed: 0, tuitionChanges: 0, transfers: 0 };

  const createdProfessors = new Map<string, string>();

  try {
    // Phase 1: Create professors first (others depend on them)
    for (const action of enabled.filter((a) => a.type === "CREATE_PROFESSOR")) {
      const d = action.data;
      const instrumentIds: string[] = [];
      for (const instName of d.instruments || []) {
        let inst = existingInstruments.find((i) => nameMatch(i.name, instName));
        if (!inst) {
          const { data: newInst } = await supabase.from("instruments").insert({ school_id: schoolId, name: instName }).select("id, name").single();
          if (newInst) {
            inst = newInst;
            existingInstruments.push(newInst);
          }
        }
        if (inst) instrumentIds.push(inst.id);
      }

      const { data: prof } = await supabase
        .from("professors")
        .insert({
          school_id: schoolId,
          name: d.name,
          instrument: d.instruments?.[0] || "",
          cost_per_student: d.costPerStudent || defaultTuition,
        })
        .select("id")
        .single();

      if (prof) {
        createdProfessors.set(d.name.toLowerCase(), prof.id);
        for (const instId of instrumentIds) {
          await supabase.from("professor_instruments").insert({ professor_id: prof.id, instrument_id: instId });
        }
        stats.professorsCreated++;
      }
      done++;
      onProgress?.(done, total);
    }

    // Phase 2: Update professors
    for (const action of enabled.filter((a) => a.type === "UPDATE_PROFESSOR")) {
      await supabase.from("professors").update({ cost_per_student: action.data.costPerStudent }).eq("id", action.data.professorId);
      done++;
      onProgress?.(done, total);
    }

    // Phase 3: Add professor instruments
    for (const action of enabled.filter((a) => a.type === "ADD_PROFESSOR_INSTRUMENT")) {
      let instId = action.data.instrumentId;
      if (!instId) {
        let inst = existingInstruments.find((i) => nameMatch(i.name, action.data.instrumentName));
        if (!inst) {
          const { data: newInst } = await supabase.from("instruments").insert({ school_id: schoolId, name: action.data.instrumentName }).select("id, name").single();
          if (newInst) {
            inst = newInst;
            existingInstruments.push(newInst);
          }
        }
        instId = inst?.id;
      }
      if (instId) {
        await supabase.from("professor_instruments").insert({ professor_id: action.data.professorId, instrument_id: instId });
      }
      done++;
      onProgress?.(done, total);
    }

    // Phase 4: Deactivate professors
    for (const action of enabled.filter((a) => a.type === "DEACTIVATE_PROFESSOR")) {
      await supabase.from("professors").update({ active: false }).eq("id", action.data.professorId);
      done++;
      onProgress?.(done, total);
    }

    // Phase 5: Create students + 12 payments each
    for (const action of enabled.filter((a) => a.type === "CREATE_STUDENT")) {
      const d = action.data;
      let profId = d.professorId;
      if (!profId) profId = createdProfessors.get(d.professorName.toLowerCase());
      if (!profId) { done++; onProgress?.(done, total); continue; }

      let instId: string | null = null;
      if (d.course) {
        const inst = existingInstruments.find((i) => nameMatch(i.name, d.course));
        if (inst) instId = inst.id;
      }

      const tuitionVal = d.tuitionAmount || defaultTuition;

      const { data: student } = await supabase
        .from("students")
        .insert({
          school_id: schoolId,
          professor_id: profId,
          name: d.name,
          situation: d.situation || "Ativo",
          lesson_day: d.lessonDay || null,
          lesson_time: d.lessonTime || null,
          tuition_amount: tuitionVal,
          enrollment_date: d.enrollmentDate || null,
          exit_date: d.exitDate || null,
          instrument_id: instId,
          person_id: d.personId || undefined,
        })
        .select("id, person_id")
        .single();

      if (student) {
        // Create 12 payments PENDING
        const payRows = [];
        for (let m = 1; m <= 12; m++) {
          payRows.push({
            student_id: student.id,
            school_id: schoolId,
            year,
            month: m,
            amount: tuitionVal,
            status: "PENDING",
          });
        }
        await supabase.from("payments").insert(payRows);

        // If this month has payment info, update it
        if (d.paidAmount > 0) {
          await supabase
            .from("payments")
            .update({
              status: "PAID",
              amount: d.paidAmount,
              paid_at: d.paidAt || `${year}-${String(month).padStart(2, "0")}-01`,
            })
            .eq("student_id", student.id)
            .eq("year", year)
            .eq("month", month);
          stats.paymentsConfirmed++;
        }

        // If multi-course and no person_id was inherited, share it with siblings
        if (d.isMultiCourse && !d.personId && student.person_id) {
          createdProfessors.set(`person:${d.name.toLowerCase()}`, student.person_id);
        }

        stats.studentsCreated++;
      }
      done++;
      onProgress?.(done, total);
    }

    // Phase 6: Transfers
    for (const action of enabled.filter((a) => a.type === "TRANSFER_STUDENT")) {
      let toProfId = action.data.toProfId;
      if (!toProfId) toProfId = createdProfessors.get(action.data.toProfName?.toLowerCase());
      if (toProfId) {
        await supabase.from("students").update({ professor_id: toProfId }).eq("id", action.data.studentId);
        stats.transfers++;
      }
      done++;
      onProgress?.(done, total);
    }

    // Phase 7: Update situations
    for (const action of enabled.filter((a) => a.type === "UPDATE_SITUATION")) {
      await supabase.from("students").update({ situation: action.data.newSituation }).eq("id", action.data.studentId);
      done++;
      onProgress?.(done, total);
    }

    // Phase 8: Update tuition + cascade PENDING payments
    for (const action of enabled.filter((a) => a.type === "UPDATE_TUITION")) {
      await supabase.from("students").update({ tuition_amount: action.data.newAmount }).eq("id", action.data.studentId);
      await supabase
        .from("payments")
        .update({ amount: action.data.newAmount })
        .eq("student_id", action.data.studentId)
        .eq("year", year)
        .gte("month", month)
        .eq("status", "PENDING");
      stats.tuitionChanges++;
      done++;
      onProgress?.(done, total);
    }

    // Phase 9: Update course
    for (const action of enabled.filter((a) => a.type === "UPDATE_COURSE")) {
      const inst = existingInstruments.find((i) => nameMatch(i.name, action.data.newCourse));
      if (inst) {
        await supabase.from("students").update({ instrument_id: inst.id }).eq("id", action.data.studentId);
      }
      done++;
      onProgress?.(done, total);
    }

    // Phase 10: Update schedule
    for (const action of enabled.filter((a) => a.type === "UPDATE_SCHEDULE")) {
      await supabase
        .from("students")
        .update({ lesson_day: action.data.day, lesson_time: action.data.time })
        .eq("id", action.data.studentId);
      done++;
      onProgress?.(done, total);
    }

    // Phase 11: Confirm payments
    for (const action of enabled.filter((a) => a.type === "CONFIRM_PAYMENT")) {
      const d = action.data;
      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("student_id", d.studentId)
        .eq("year", d.year)
        .eq("month", d.month)
        .maybeSingle();

      if (existing) {
        await supabase.from("payments").update({ status: "PAID", amount: d.amount, paid_at: d.paidAt }).eq("id", existing.id);
      } else {
        await supabase.from("payments").insert({ student_id: d.studentId, school_id: schoolId, year: d.year, month: d.month, amount: d.amount, status: "PAID", paid_at: d.paidAt });
      }
      stats.paymentsConfirmed++;
      done++;
      onProgress?.(done, total);
    }

    // Phase 12: Churn
    for (const action of enabled.filter((a) => a.type === "POSSIBLE_CHURN")) {
      const choice = action.churnChoice || "Evadido";
      if (choice === "ignore") { done++; onProgress?.(done, total); continue; }
      await supabase.from("students").update({ situation: choice }).eq("id", action.data.studentId);
      stats.studentsChurned++;
      done++;
      onProgress?.(done, total);
    }

    return { success: true, stats };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro desconhecido", stats };
  }
}

// ─── Import History ─────────────────────────────────────────────────────────

export async function getImportHistory(schoolId: string): Promise<ImportHistoryEntry[]> {
  const { data } = await supabase
    .from("import_history")
    .select("*")
    .eq("school_id", schoolId)
    .order("year", { ascending: true })
    .order("month", { ascending: true });
  return (data || []) as ImportHistoryEntry[];
}

export async function saveImportHistory(
  schoolId: string,
  year: number,
  month: number,
  stats: { professorsCreated: number; studentsCreated: number; studentsChurned: number; paymentsConfirmed: number; tuitionChanges: number; transfers: number },
  fileName: string
) {
  const { data: existing } = await supabase
    .from("import_history")
    .select("id")
    .eq("school_id", schoolId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  const row = {
    school_id: schoolId,
    year,
    month,
    professors_created: stats.professorsCreated,
    students_created: stats.studentsCreated,
    students_churned: stats.studentsChurned,
    payments_confirmed: stats.paymentsConfirmed,
    tuition_changes: stats.tuitionChanges,
    transfers: stats.transfers,
    file_name: fileName,
    imported_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from("import_history").update(row).eq("id", existing.id);
  } else {
    await supabase.from("import_history").insert(row);
  }
}

// ─── Template generator ─────────────────────────────────────────────────────

export function downloadTemplate() {
  const headers = ["Professor", "Instrumento Prof", "Custo Aluno", "Nome Aluno", "Curso", "Situação", "Dia", "Horário", "Mensalidade", "Pagou", "Data Pgto", "Data Matrícula", "Data Saída"];
  const sample = [
    ["Maria Santos", "Piano, Canto", "100", "Pedro Lima", "Piano", "Ativo", "Seg", "14:00", "200", "200", "15/01/2026", "10/01/2026", ""],
    ["Maria Santos", "Piano, Canto", "100", "Ana Silva", "Canto", "Ativo", "Ter", "10:00", "180", "180", "18/01/2026", "05/11/2025", ""],
    ["Maria Santos", "Piano, Canto", "100", "Lucas Costa", "Piano", "Evadido", "", "", "200", "0", "", "15/05/2025", "30/01/2026"],
    ["João Mendes", "Guitarra", "80", "Rafael Souza", "Guitarra", "Ativo", "Qua", "16:00", "150", "150", "20/01/2026", "12/01/2026", ""],
    ["João Mendes", "Guitarra", "80", "Marcos Lima", "Guitarra", "Ativo", "Qui", "15:00", "150", "0", "", "08/08/2025", ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, "MusicFinance_Template_Import.xlsx");
}
