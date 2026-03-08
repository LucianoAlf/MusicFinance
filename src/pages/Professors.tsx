import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { MonthSelector } from "../components/MonthSelector";
import { KpiCard } from "../components/KpiCard";
import { Select, DatePicker, Modal, ConfirmModal, useConfirm } from "../components/ui";
import { AvatarUploader } from "../components/ui/AvatarUploader";
import { uploadProfessorAvatar, deleteProfessorAvatar } from "../lib/supabaseData";
import { brl, pct, MS, MF, cn } from "../lib/utils";
import type { Student, Instrument, Payment, DisplayStatus } from "../types";
import { ProfessorStatement } from "../components/ProfessorStatement";
import {
  Users,
  GraduationCap,
  CheckCircle,
  DollarSign,
  Wallet,
  Target,
  BarChart,
  Activity,
  Plus,
  Music,
  UserPlus,
  UserMinus,
  Clock,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from "lucide-react";

const SITUATIONS = ["Ativo", "Evadido", "Trancado"] as const;

const sitStyle = (sit: string) => {
  switch (sit) {
    case "Ativo":    return "bg-accent-green/10 text-accent-green";
    case "Evadido":  return "bg-accent-red/10 text-accent-red";
    case "Trancado": return "bg-accent-amber/10 text-accent-amber";
    default:         return "bg-surface-tertiary text-text-secondary";
  }
};

function calcPermanencia(enrollmentDate: string | undefined): string {
  if (!enrollmentDate) return "—";
  const inicio = new Date(enrollmentDate);
  const agora = new Date();
  const meses = (agora.getFullYear() - inicio.getFullYear()) * 12 + (agora.getMonth() - inicio.getMonth());
  if (meses < 1) return "< 1m";
  if (meses < 12) return `${meses}m`;
  const anos = Math.floor(meses / 12);
  const rest = meses % 12;
  return rest > 0 ? `${anos}a ${rest}m` : `${anos}a`;
}

const DAY_OPTIONS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((d) => ({ value: d, label: d }));

const AVATARS_F = ["/Avatar_Menina_GenZ.svg", "/Avatar_Menina2_GenZ.svg"];
const AVATARS_M = ["/Avatar_Menino_GenZ.svg", "/Avatar_Menino2_GenZ.svg"];

function guessGender(name: string): "M" | "F" {
  const first = name.trim().split(/\s+/)[0].toLowerCase();
  const femEndings = ["a", "ane", "ene", "ice", "ilde", "ine", "ise", "ete", "ude"];
  const mascExceptions = new Set([
    "luca", "josua", "nikita", "sascha", "costa", "borba", "moura",
    "sousa", "souza", "silva", "vieira", "pereira", "oliveira",
  ]);
  const femExceptions = new Set([
    "alice", "diane", "eliane", "fabiane", "juliane", "luciane",
    "mariane", "viviane", "simone", "michele", "gisele", "noele",
    "denise", "heloíse", "heloise", "cleide", "adelaide", "ione",
    "marge", "irene", "marlene", "darlene",
  ]);
  if (femExceptions.has(first)) return "F";
  if (mascExceptions.has(first)) return "M";
  if (femEndings.some((e) => first.endsWith(e))) return "F";
  return "M";
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getAvatar(name: string): string {
  const gender = guessGender(name);
  const pool = gender === "F" ? AVATARS_F : AVATARS_M;
  return pool[hashCode(name) % pool.length];
}

export const Professors = () => {
  const { selectedSchool } = useAuth();
  const schoolId = selectedSchool?.id;
  const {
    data, instruments, curMo, setCurMo, selProf, setSelProf, selPay, setSelPay,
    viewKpis,
    handleAddProfessor, handleUpdateProfessor, handleDeleteProfessor,
    handleAddStudent, handleUpdateStudent, handleDeleteStudent,
    handleConfirmPayment, handleWaivePayment, handleRevertPayment,
    handleAddInstrument, handleAddProfessorInstrument, handleRemoveProfessorInstrument,
  } = useData();

  const [showAddProf, setShowAddProf] = useState(false);
  const [showAddStud, setShowAddStud] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editProf, setEditProf] = useState<string | null>(null);
  const [showStatement, setShowStatement] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Bulk delete states (students)
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [bulkDeleteSelected, setBulkDeleteSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Bulk delete states (professors)
  const [bulkProfDeleteMode, setBulkProfDeleteMode] = useState(false);
  const [bulkProfSelected, setBulkProfSelected] = useState<Set<string>>(new Set());
  const [bulkProfDeleting, setBulkProfDeleting] = useState(false);

  // Add professor form
  const [npName, setNpName] = useState("");
  const [npCost, setNpCost] = useState("100");
  const [npInstIds, setNpInstIds] = useState<string[]>([]);
  const [npNewInst, setNpNewInst] = useState("");
  const [npAvatarBlob, setNpAvatarBlob] = useState<Blob | null>(null);

  // Add student form
  const [nsName, setNsName] = useState("");
  const [nsHour, setNsHour] = useState("14:00");
  const [nsDay, setNsDay] = useState("Seg");
  const [nsVal, setNsVal] = useState(data?.config.tuition.toString() || "358");
  const [nsEnroll, setNsEnroll] = useState(new Date().toISOString().split("T")[0]);
  const [nsInstId, setNsInstId] = useState("");
  const [nsDueDay, setNsDueDay] = useState("5");
  const [nsPayMethod, setNsPayMethod] = useState("");
  const [nsSubmitting, setNsSubmitting] = useState(false);
  const [nsExisting, setNsExisting] = useState(false);
  const [nsPersonId, setNsPersonId] = useState("");

  // Edit student modal state
  const [esName, setEsName] = useState("");
  const [esDay, setEsDay] = useState("");
  const [esHour, setEsHour] = useState("");
  const [esSit, setEsSit] = useState("");
  const [esEnroll, setEsEnroll] = useState("");
  const [esTuition, setEsTuition] = useState("");
  const [esInstId, setEsInstId] = useState("");
  const [esDueDay, setEsDueDay] = useState("5");
  const [esPayMethod, setEsPayMethod] = useState("");
  const [esPhone, setEsPhone] = useState("");
  const [esRespName, setEsRespName] = useState("");
  const [esRespPhone, setEsRespPhone] = useState("");

  // Edit professor modal state
  const [epName, setEpName] = useState("");
  const [epCost, setEpCost] = useState("");
  const [epNewInst, setEpNewInst] = useState("");
  const [epAvatarBlob, setEpAvatarBlob] = useState<Blob | null>(null);
  const [epAvatarRemoved, setEpAvatarRemoved] = useState(false);

  const { state: confirmState, confirm, close: confirmClose } = useConfirm();

  // Payment popover state
  const [payPopover, setPayPopover] = useState<{ profId: string; student: Student; month: number; payment: Payment | null; tuition: number } | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const getDisplayStatus = (s: Student, monthIdx: number): DisplayStatus => {
    const pm = s.payments[monthIdx];
    if (pm && pm.status === "PAID") return "PAID";
    if (pm && pm.status === "WAIVED") return "WAIVED";
    
    const now = new Date();
    const currentActualMonth = now.getMonth();
    const currentActualDay = now.getDate();
    const currentActualYear = now.getFullYear();
    const selectedYear = data.config.year;

    let isPast = false;
    if (selectedYear < currentActualYear) {
      isPast = true;
    } else if (selectedYear === currentActualYear) {
      if (monthIdx < currentActualMonth) {
        isPast = true;
      } else if (monthIdx === currentActualMonth) {
        const due = s.dueDay ?? 5;
        if (currentActualDay > due) {
          isPast = true;
        }
      }
    }

    if (isPast) return "LATE";
    if (monthIdx > curMo) return "FUTURE";
    return "PENDING";
  };

  if (!data) return null;

  // Situation options with colors
  const situationOptions = SITUATIONS.map((sit) => ({
    value: sit,
    label: sit,
    color: sitStyle(sit),
  }));

  const cd = cn(
    "rounded-xl p-4 shadow-sm border",
    "bg-surface-secondary border-border-primary"
  );
  const inp = cn(
    "w-full px-3 py-2.5 rounded-lg text-xs border bg-surface-secondary border-border-secondary text-text-primary",
    "focus:outline-none focus:ring-1 focus:ring-border-hover transition-all duration-150"
  );
  const lbl = "text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider";

  let _tP = data.professors.length,
    _tA = 0,
    _tR = 0,
    _tF = 0;
  const _paidPersonIds = new Set<string>();
  const _allPersonIds = new Set<string>();
  let _totalEnrollments = 0;
  data.professors.forEach((p) => {
    _totalEnrollments += p.students.length;
    let activeCount = 0;
    p.students.forEach((s) => {
      _allPersonIds.add(s.personId || s.id);
      if (s.situation === "Ativo") {
        activeCount++;
      }
      const pm = s.payments && s.payments[curMo];
      if (pm && pm.status === "PAID" && pm.amount > 0) { _tR += pm.amount; _paidPersonIds.add(s.personId || s.id); }
    });
    _tF += activeCount * p.costPerStudent;
  });
  _tA = _allPersonIds.size;
  const _tPg = _paidPersonIds.size;
  const _pF = _tR > 0 ? _tF / _tR : 0;
  const _tk = _tPg > 0 ? _tR / _tPg : 0;
  const _ma = _tP > 0 ? _allPersonIds.size / _tP : 0;

  const kpiMes = viewKpis?.monthly?.find((k) => k.month === curMo + 1);
  const avgTenure = viewKpis?.avgTenureMonths ?? 0;
  const newEnrollments = kpiMes?.newEnrollments ?? 0;
  const churnedStudents = kpiMes?.churnedStudents ?? 0;

  const prof = selProf ? data.professors.find((p) => p.id === selProf) : null;
  const confirmAddProf = async () => {
    if (!npName.trim() || npInstIds.length === 0) return;
    const firstInstName = instruments.find(i => i.id === npInstIds[0])?.name || "";
    const profId = await handleAddProfessor({ name: npName.trim(), instrument: firstInstName, costPerStudent: Number(npCost) || 100, instrumentIds: npInstIds });
    if (profId && npAvatarBlob && schoolId) {
      const url = await uploadProfessorAvatar(npAvatarBlob, schoolId, profId);
      if (url) await handleUpdateProfessor(profId, { avatarUrl: url });
    }
    setShowAddProf(false);
    setNpName(""); setNpCost("100"); setNpInstIds([]); setNpNewInst(""); setNpAvatarBlob(null);
  };

  const confirmAddStudent = async (pid: string) => {
    if (!nsName.trim() || nsSubmitting) return;
    setNsSubmitting(true);
    await handleAddStudent(pid, {
      name: nsName.trim(),
      day: nsDay,
      time: nsHour,
      tuition: Number(nsVal) || data.config.tuition,
      enrollmentDate: nsEnroll,
      instrumentId: nsInstId || undefined,
      personId: nsExisting && nsPersonId ? nsPersonId : undefined,
      dueDay: Number(nsDueDay) || 5,
      paymentMethod: nsPayMethod || undefined,
    });
    setShowAddStud(null);
    setNsName(""); setNsEnroll(new Date().toISOString().split("T")[0]); setNsInstId("");
    setNsExisting(false); setNsPersonId(""); setNsDueDay("5"); setNsPayMethod("");
    setNsSubmitting(false);
  };

  const openEditStudent = (s: Student) => {
    setEditStudent(s);
    setEsName(s.name);
    setEsDay(s.day || "Seg");
    setEsHour(s.hour || "14:00");
    setEsSit(s.situation || "Ativo");
    setEsEnroll(s.enrollmentDate || "");
    setEsTuition(s.tuitionAmount?.toString() || data.config.tuition.toString());
    setEsInstId(s.instrumentId || "");
    setEsDueDay(s.dueDay?.toString() || "5");
    setEsPayMethod(s.paymentMethod || "");
    setEsPhone(s.phone || "");
    setEsRespName(s.responsibleName || "");
    setEsRespPhone(s.responsiblePhone || "");
  };

  const saveEditStudent = async () => {
    if (!editStudent) return;
    await handleUpdateStudent(editStudent.id, {
      name: esName.trim() || undefined,
      situation: esSit || undefined,
      day: esDay || undefined,
      hour: esHour || undefined,
      enrollmentDate: esEnroll || undefined,
      tuitionAmount: esTuition ? Number(esTuition) : undefined,
      instrumentId: esInstId || undefined,
      phone: esPhone,
      responsibleName: esRespName,
      responsiblePhone: esRespPhone,
      dueDay: Number(esDueDay) || 5,
      paymentMethod: esPayMethod || undefined,
    });
    setEditStudent(null);
  };

  const changeSituation = async (studentId: string, newSit: string) => {
    await handleUpdateStudent(studentId, { situation: newSit });
  };

  const removeProf = (pid: string) => {
    confirm({
      title: "Remover Professor",
      message: "Tem certeza que deseja remover este professor e todos os seus alunos?",
      confirmLabel: "Remover",
      variant: "danger",
      onConfirm: () => handleDeleteProfessor(pid),
    });
  };

  const removeStudent = (pid: string, sid: string) => {
    confirm({
      title: "Remover Aluno",
      message: "Tem certeza que deseja remover este aluno?",
      confirmLabel: "Remover",
      variant: "danger",
      onConfirm: () => handleDeleteStudent(pid, sid),
    });
  };

  // Bulk delete functions
  const toggleDeleteAll = (studentIds: string[]) => {
    if (bulkDeleteSelected.size === studentIds.length) {
      setBulkDeleteSelected(new Set());
    } else {
      setBulkDeleteSelected(new Set(studentIds));
    }
  };

  const toggleDeleteOne = (studentId: string) => {
    setBulkDeleteSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const confirmBulkDelete = () => {
    if (!selProf || bulkDeleteSelected.size === 0) return;

    confirm({
      title: "Excluir Alunos",
      message: `Tem certeza que deseja excluir ${bulkDeleteSelected.size} aluno(s)? Esta ação não pode ser desfeita.`,
      confirmLabel: `Excluir ${bulkDeleteSelected.size}`,
      variant: "danger",
      onConfirm: async () => {
        setBulkDeleting(true);
        for (const studentId of bulkDeleteSelected) {
          await handleDeleteStudent(selProf, studentId);
        }
        setBulkDeleting(false);
        setBulkDeleteMode(false);
        setBulkDeleteSelected(new Set());
      },
    });
  };

  // Bulk delete functions (professors)
  const toggleProfDeleteOne = (profId: string) => {
    setBulkProfSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profId)) next.delete(profId);
      else next.add(profId);
      return next;
    });
  };

  const confirmBulkProfDelete = () => {
    if (bulkProfSelected.size === 0 || !data) return;

    const totalStudents = data.professors
      .filter(p => bulkProfSelected.has(p.id))
      .reduce((sum, p) => sum + p.students.length, 0);

    confirm({
      title: "Excluir Professores",
      message: `Tem certeza que deseja excluir ${bulkProfSelected.size} professor(es) e seus ${totalStudents} aluno(s)? Esta ação não pode ser desfeita.`,
      confirmLabel: `Excluir ${bulkProfSelected.size}`,
      variant: "danger",
      onConfirm: async () => {
        setBulkProfDeleting(true);
        for (const profId of bulkProfSelected) {
          await handleDeleteProfessor(profId);
        }
        setBulkProfDeleting(false);
        setBulkProfDeleteMode(false);
        setBulkProfSelected(new Set());
        setSelProf(null);
      },
    });
  };

  const openEditProf = (p: { id: string; name: string; costPerStudent: number }) => {
    setEditProf(p.id);
    setEpName(p.name);
    setEpCost(p.costPerStudent.toString());
    setEpNewInst("");
    setEpAvatarBlob(null);
    setEpAvatarRemoved(false);
  };

  const saveEditProf = async () => {
    if (!editProf || !schoolId) return;
    const updates: { name?: string; costPerStudent?: number; avatarUrl?: string | null } = {};
    const currentProf = data.professors.find(p => p.id === editProf);
    if (!currentProf) return;
    if (epName.trim() && epName.trim() !== currentProf.name) updates.name = epName.trim();
    const newCost = Number(epCost);
    if (newCost > 0 && newCost !== currentProf.costPerStudent) updates.costPerStudent = newCost;
    if (epAvatarBlob) {
      const url = await uploadProfessorAvatar(epAvatarBlob, schoolId, editProf);
      if (url) updates.avatarUrl = url;
    } else if (epAvatarRemoved && currentProf.avatarUrl) {
      await deleteProfessorAvatar(schoolId, editProf);
      updates.avatarUrl = null;
    }
    if (Object.keys(updates).length > 0) await handleUpdateProfessor(editProf, updates);
    setEditProf(null);
  };

  const openPayPopover = (profId: string, s: Student, mi: number) => {
    const pm = s.payments[mi];
    const tuition = s.tuitionAmount || data.config.tuition;
    setPayPopover({ profId, student: s, month: mi, payment: pm, tuition });
    setPayAmount(pm ? pm.amount.toString() : tuition.toString());
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Professores</h1>
            <p className="text-xs mt-1 text-text-secondary">
              {data.professors.length} profs · {_tA} alunos · {MF[curMo]}
            </p>
          </div>
          <MonthSelector curMo={curMo} setCurMo={setCurMo} />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setBulkProfDeleteMode(!bulkProfDeleteMode);
              setBulkProfSelected(new Set());
            }}
            className={cn(
              "p-2.5 rounded-lg transition-all border cursor-pointer",
              bulkProfDeleteMode
                ? "bg-accent-red/10 text-accent-red border-accent-red/30"
                : "bg-transparent text-text-tertiary hover:bg-accent-red/10 hover:text-accent-red border-border-secondary"
            )}
            title="Modo de exclusão múltipla de professores"
          >
            <Trash2 size={14} />
          </button>
          <button onClick={() => setShowAddProf(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-all border-none cursor-pointer">
            <Plus size={14} /> Novo Professor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        <KpiCard icon={Users} label="Professores" value={_tP} color="purple" />
        <KpiCard icon={GraduationCap} label="Alunos" value={_tA} color="blue" />
        <KpiCard icon={CheckCircle} label={`Pagantes ${MS[curMo]}`} value={_tPg} color="green" />
        <KpiCard icon={DollarSign} label={`Receita ${MS[curMo]}`} value={brl(_tR)} color="green" />
        <KpiCard icon={Wallet} label="Folha Prof." value={brl(_tF)} color="red" />
        <KpiCard icon={Target} label="% Folha/Fat." value={pct(_pF)} color={_pF > 0.45 ? "red" : "green"} />
        <KpiCard icon={BarChart} label="Ticket Médio" value={brl(_tk)} color="teal" />
        <KpiCard icon={Activity} label="Média Aluno/Prof" value={_ma.toFixed(1)} color="blue" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <KpiCard icon={Clock} label="Permanência" value={avgTenure.toFixed(1) + " meses"} color="cyan" />
        <KpiCard icon={UserPlus} label={`Matrículas ${MS[curMo]}`} value={newEnrollments} color="teal" />
        <KpiCard icon={UserMinus} label={`Evasões ${MS[curMo]}`} value={churnedStudents} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
          {data.professors.map((p, profIdx) => {
            const pay = p.students.filter((s) => { const pm = s.payments?.[curMo]; return pm && pm.status === "PAID" && pm.amount > 0; }).length;
            const activeForProf = p.students.filter((s) => s.situation === "Ativo").length;
            const rev = p.students.reduce((sum, s) => { const pm = s.payments?.[curMo]; return sum + (pm && pm.status === "PAID" ? pm.amount : 0); }, 0);
            const pp = rev > 0 ? (activeForProf * p.costPerStudent) / rev : 0;
            const ticketProf = pay > 0 ? rev / pay : 0;
            const prevRev = curMo > 0 ? p.students.reduce((sum, s) => { const pm = s.payments?.[curMo - 1]; return sum + (pm && pm.status === "PAID" ? pm.amount : 0); }, 0) : null;
            const trendProf = prevRev != null && prevRev > 0 ? ((rev - prevRev) / prevRev) * 100 : null;
            const trendUp = trendProf != null && trendProf >= 0;

            return (
              <div key={p.id} onClick={() => { if (!bulkProfDeleteMode) { setSelProf(p.id); setSelPay(null); } }}
                className={cn("rounded-xl p-3 cursor-pointer transition-all border",
                  selProf === p.id
                    ? "bg-surface-tertiary border-border-hover ring-1 ring-border-hover"
                    : "bg-surface-secondary border-border-primary hover:bg-surface-tertiary/50 hover:border-border-secondary",
                  bulkProfDeleteMode && bulkProfSelected.has(p.id) && "ring-1 ring-accent-red border-accent-red/30"
                )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {bulkProfDeleteMode && (
                      <input
                        type="checkbox"
                        checked={bulkProfSelected.has(p.id)}
                        onChange={(e) => { e.stopPropagation(); toggleProfDeleteOne(p.id); }}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-accent-red w-4 h-4 cursor-pointer shrink-0"
                      />
                    )}
                    <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden">
                      <img src={p.avatarUrl || getAvatar(p.name)} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">{p.name}</p>
                      <p className="text-[10px] text-text-secondary">{p.instruments.length > 0 ? p.instruments.map(i => i.name).join(", ") : p.instrument} · {p.students.length} al. · {pay} pag.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <p className="text-xs font-mono font-bold text-accent-green">{brl(rev)}</p>
                      {trendProf != null && (
                        <span className={cn("text-[9px] flex items-center font-mono", trendUp ? "text-accent-green" : "text-accent-red")}>
                          {trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{Math.abs(trendProf).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className={cn("text-[10px]", pp > 0.45 ? "text-accent-red font-semibold" : "text-text-secondary")}>{pct(pp)} folha</p>
                    <p className="text-[9px] text-accent-blue font-mono font-medium">Ticket: {brl(ticketProf)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {prof ? (
            <div className="rounded-xl p-4 bg-surface-secondary border border-border-primary">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full shrink-0 overflow-hidden">
                    <img src={prof.avatarUrl || getAvatar(prof.name)} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <button
                      onClick={() => openEditProf(prof)}
                      className="font-bold text-lg border-none bg-transparent cursor-pointer p-0 text-left transition-colors text-text-primary hover:text-accent-blue"
                    >{prof.name}</button>
                    <p className="text-[11px] text-text-tertiary tracking-wide mt-0.5">
                      {prof.instruments.length > 0 ? prof.instruments.map(i => i.name).join(", ") : prof.instrument} · R$ {prof.costPerStudent}/aluno · {prof.students.length} alunos · {prof.students.filter((s) => { const pm = s.payments?.[curMo]; return pm && pm.status === "PAID" && pm.amount > 0; }).length} pagantes
                    </p>
                    <p className="text-[11px] font-mono font-medium text-accent-green mt-1">
                      Receita {MS[curMo]}: {brl(prof.students.reduce((sum, s) => { const pm = s.payments?.[curMo]; return sum + (pm && pm.status === "PAID" ? pm.amount : 0); }, 0))}
                      <span className="ml-3 text-accent-blue">
                        Ticket: {brl((() => { const payP = prof.students.filter((s) => { const pm = s.payments?.[curMo]; return pm && pm.status === "PAID" && pm.amount > 0; }).length; const revP = prof.students.reduce((sum, s) => { const pm = s.payments?.[curMo]; return sum + (pm && pm.status === "PAID" ? pm.amount : 0); }, 0); return payP > 0 ? revP / payP : 0; })())}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowStatement(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-tertiary text-text-secondary text-[11px] font-medium hover:text-text-primary hover:bg-surface-tertiary/80 transition-all border border-border-secondary cursor-pointer">
                    <FileText size={14} /> Extrato
                  </button>
                  <button onClick={() => setShowAddStud(prof.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-btn-bg text-primary-btn-text text-[11px] font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer">
                    <UserPlus size={14} /> Novo Aluno
                  </button>
                  <button
                    onClick={() => {
                      setBulkDeleteMode(!bulkDeleteMode);
                      setBulkDeleteSelected(new Set());
                    }}
                    className={cn(
                      "p-2 rounded-lg transition-all border cursor-pointer",
                      bulkDeleteMode
                        ? "bg-accent-red/10 text-accent-red border-accent-red/30"
                        : "bg-transparent text-text-tertiary hover:bg-accent-red/10 hover:text-accent-red border-border-secondary"
                    )}
                    title="Modo de exclusão múltipla"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => removeProf(prof.id)} className="p-2 rounded-lg bg-transparent text-text-tertiary hover:bg-accent-red/10 hover:text-accent-red transition-all border border-border-secondary cursor-pointer" title="Remover professor">
                    <UserMinus size={14} />
                  </button>
                </div>
              </div>

              {/* Bulk Payment Bar */}
              {(() => {
                const unpaid = prof.students.filter((s) => {
                  if (s.situation !== "Ativo") return false;
                  const pm = s.payments[curMo];
                  return !pm || pm.status === "PENDING";
                });
                if (unpaid.length === 0) return null;

                const toggleBulkMode = () => {
                  if (bulkMode) {
                    setBulkMode(false);
                    setBulkSelected(new Set());
                  } else {
                    setBulkMode(true);
                    setBulkSelected(new Set(unpaid.map((s) => s.id)));
                  }
                };

                const toggleAll = () => {
                  if (bulkSelected.size === unpaid.length) {
                    setBulkSelected(new Set());
                  } else {
                    setBulkSelected(new Set(unpaid.map((s) => s.id)));
                  }
                };

                const toggleOne = (id: string) => {
                  setBulkSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  });
                };

                const confirmBulk = async () => {
                  if (bulkSelected.size === 0) return;
                  setBulkProcessing(true);
                  const selected = unpaid.filter((s) => bulkSelected.has(s.id));
                  for (const s of selected) {
                    const amount = s.tuitionAmount || data.config.tuition;
                    await handleConfirmPayment(prof.id, s.id, curMo, amount);
                  }
                  setBulkProcessing(false);
                  setBulkMode(false);
                  setBulkSelected(new Set());
                };

                return (
                  <div className="mt-4 rounded-lg border border-border-secondary bg-surface-tertiary/50 p-3">
                    {!bulkMode ? (
                      <button
                        onClick={toggleBulkMode}
                        className="flex items-center gap-2 text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors border-none bg-transparent cursor-pointer p-0"
                      >
                        <CheckCircle size={14} className="text-accent-green" />
                        Dar baixa no mês — {unpaid.length} {unpaid.length === 1 ? "pendente" : "pendentes"}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={bulkSelected.size === unpaid.length}
                              onChange={toggleAll}
                              className="accent-accent-green w-3.5 h-3.5"
                            />
                            <span className="text-[11px] font-semibold text-text-primary">
                              Selecionar todos ({unpaid.length})
                            </span>
                          </label>
                          <button
                            onClick={() => { setBulkMode(false); setBulkSelected(new Set()); }}
                            className="text-[10px] text-text-tertiary hover:text-text-primary border-none bg-transparent cursor-pointer p-0 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                        <div className="space-y-1 max-h-[200px] overflow-y-auto">
                          {unpaid.map((s) => (
                            <label key={s.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-surface-tertiary cursor-pointer select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={bulkSelected.has(s.id)}
                                onChange={() => toggleOne(s.id)}
                                className="accent-accent-green w-3.5 h-3.5"
                              />
                              <span className="text-[11px] text-text-primary flex-1">{s.name}</span>
                              <span className="text-[10px] font-mono text-text-secondary">{brl(s.tuitionAmount || data.config.tuition)}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border-primary">
                          <span className="text-[10px] text-text-secondary">
                            {bulkSelected.size} selecionados · Total: <span className="font-mono font-bold text-accent-green">{brl(unpaid.filter((s) => bulkSelected.has(s.id)).reduce((sum, s) => sum + (s.tuitionAmount || data.config.tuition), 0))}</span>
                          </span>
                          <button
                            onClick={confirmBulk}
                            disabled={bulkSelected.size === 0 || bulkProcessing}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-green text-surface-primary text-[11px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity border-none cursor-pointer"
                          >
                            <CheckCircle size={14} />
                            {bulkProcessing ? "Processando..." : `Confirmar ${bulkSelected.size} pagamentos`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="overflow-auto max-h-[58vh] mt-4">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-surface-secondary">
                    <tr>
                      {bulkDeleteMode && (
                        <th className="pb-2 px-2 w-10 border-b border-border-primary">
                          <input
                            type="checkbox"
                            checked={bulkDeleteSelected.size === prof.students.length && prof.students.length > 0}
                            onChange={() => toggleDeleteAll(prof.students.map(s => s.id))}
                            className="accent-accent-red w-3.5 h-3.5 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-2 border-b border-border-primary font-medium">Nome</th>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-1 w-16 border-b border-border-primary font-medium">Curso</th>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-1 w-14 text-center border-b border-border-primary font-medium">Perm.</th>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-1 w-12 text-center border-b border-border-primary font-medium">Hora</th>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-1 w-10 text-center border-b border-border-primary font-medium">Dia</th>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-1 w-24 border-b border-border-primary font-medium">Situação</th>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-1 w-20 text-center border-b border-border-primary font-medium">Forma</th>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 w-10 text-center border-b border-border-primary font-medium">Pgto</th>
                      <th className="pb-2 w-8 border-b border-border-primary"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {prof.students.map((s) => {
                      const isInactive = s.situation !== "Ativo";
                      return (
                        <React.Fragment key={s.id}>
                          <tr className={cn("border-t border-border-primary transition-colors hover:bg-surface-tertiary", isInactive && "opacity-60")}>
                            {bulkDeleteMode && (
                              <td className="py-2.5 px-2">
                                <input
                                  type="checkbox"
                                  checked={bulkDeleteSelected.has(s.id)}
                                  onChange={() => toggleDeleteOne(s.id)}
                                  className="accent-accent-red w-3.5 h-3.5 cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="py-2.5 px-2">
                              <button
                                onClick={() => openEditStudent(s)}
                                className={cn(
                                  "border-none bg-transparent cursor-pointer p-0 text-left font-medium transition-colors text-text-primary hover:text-accent-blue",
                                  s.situation === "Evadido" && "line-through text-text-tertiary"
                                )}
                              >
                                {s.name}
                              </button>
                            </td>
                            <td className="py-2.5 px-1 text-left text-[11px] text-text-secondary">
                              {s.instrumentName || "—"}
                            </td>
                            <td className="py-2.5 px-1 text-center text-[11px] text-text-secondary">
                              {calcPermanencia(s.enrollmentDate)}
                            </td>
                            <td className="py-2.5 px-1 text-center text-[11px] text-text-secondary">{s.hour || "—"}</td>
                            <td className="py-2.5 px-1 text-center text-[11px] text-text-secondary">{s.day || "—"}</td>
                            <td className="py-2 px-1 text-left">
                              <Select
                                value={s.situation || "Ativo"}
                                onValueChange={(v) => changeSituation(s.id, v)}
                                options={situationOptions}
                                compact
                              />
                            </td>
                            <td className="py-2.5 px-1 text-center text-[10px] text-text-secondary whitespace-nowrap">
                              {s.paymentMethod || "—"}
                            </td>
                            <td className="py-2.5 text-center">
                              <button onClick={() => setSelPay(selPay === s.id ? null : s.id)}
                                className={cn("p-1.5 rounded-lg text-[10px] font-medium transition-all border-none cursor-pointer",
                                  selPay === s.id ? "bg-surface-tertiary text-text-primary" : "bg-transparent text-text-tertiary hover:bg-surface-tertiary")}>
                                {selPay === s.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </td>
                            <td className="py-2.5 text-center">
                              <button onClick={() => removeStudent(prof.id, s.id)} className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-red hover:bg-accent-red/10 transition-all border-none bg-transparent cursor-pointer">
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                          {selPay === s.id && (
                            <tr>
                              <td colSpan={bulkDeleteMode ? 10 : 9}>
                                <div className="p-4 my-2 rounded-xl border border-border-secondary bg-surface-primary">
                                  <p className="text-[10px] font-semibold mb-3 uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                                    <Calendar size={12} /> Pagamentos {data.config.year}
                                  </p>
                                  <div className="grid grid-cols-12 gap-2">
                                    {MS.map((m, mi) => {
                                      const pm = s.payments[mi];
                                      const ds = getDisplayStatus(s, mi);
                                      const cellColor = {
                                        PAID: "bg-accent-green/10 text-accent-green",
                                        PENDING: "bg-accent-amber/15 text-accent-amber",
                                        LATE: "bg-accent-red/10 text-accent-red",
                                        WAIVED: "bg-transparent text-text-tertiary line-through",
                                        FUTURE: "bg-transparent text-text-tertiary",
                                      }[ds];
                                      return (
                                        <div key={m} className="text-center">
                                          <label className={cn("text-[9px] font-medium uppercase tracking-wider block mb-1.5", mi === curMo ? "text-text-primary font-bold" : "text-text-secondary")}>{m}</label>
                                          <button
                                            onClick={() => openPayPopover(prof.id, s, mi)}
                                            className={cn("w-full text-center py-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80", cellColor, mi === curMo && "ring-1 ring-border-hover")}
                                          >
                                            <div className="font-mono font-medium text-[11px]">{pm ? (ds === "WAIVED" ? "—" : pm.amount) : "—"}</div>
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4 rounded-xl border border-border-primary bg-surface-secondary">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-surface-tertiary text-text-tertiary border border-border-secondary"><Users size={32} strokeWidth={1.5} /></div>
              <p className="text-sm font-medium text-text-secondary">Selecione um professor à esquerda</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Professor */}
      <Modal
        open={showAddProf}
        onOpenChange={(v) => { if (!v) setShowAddProf(false); }}
        title="Novo Professor"
        size="sm"
      >
        <div className="space-y-4">
          <AvatarUploader
            fallbackUrl={npName.trim() ? getAvatar(npName.trim()) : "/Avatar_Menino_GenZ.svg"}
            onCropped={(blob) => setNpAvatarBlob(blob)}
          />
          <div>
            <label className={lbl}>Nome</label>
            <input value={npName} onChange={(e) => setNpName(e.target.value)} className={inp} placeholder="Ex: João Silva" autoFocus />
          </div>
          <div>
            <label className={lbl}>Instrumentos</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {npInstIds.map(iid => {
                const inst = instruments.find(i => i.id === iid);
                return (
                  <span key={iid} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-surface-tertiary text-text-primary border border-border-secondary">
                    {inst?.name}
                    <button onClick={() => setNpInstIds(prev => prev.filter(id => id !== iid))} className="border-none bg-transparent cursor-pointer p-0 text-text-tertiary hover:text-accent-red"><X size={10} /></button>
                  </span>
                );
              })}
            </div>
            <Select
              value=""
              onValueChange={(v) => { if (v && !npInstIds.includes(v)) setNpInstIds(prev => [...prev, v]); }}
              options={instruments.filter(i => !npInstIds.includes(i.id)).map(i => ({ value: i.id, label: i.name }))}
              placeholder="Selecionar instrumento..."
            />
            <div className="flex gap-2 mt-2">
              <input
                value={npNewInst}
                onChange={(e) => setNpNewInst(e.target.value)}
                className={cn(inp, "flex-1")}
                placeholder="Novo instrumento..."
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && npNewInst.trim()) {
                    const created = await handleAddInstrument(npNewInst.trim());
                    if (created) { setNpInstIds(prev => [...prev, created.id]); setNpNewInst(""); }
                  }
                }}
              />
              <button
                onClick={async () => {
                  if (npNewInst.trim()) {
                    const created = await handleAddInstrument(npNewInst.trim());
                    if (created) { setNpInstIds(prev => [...prev, created.id]); setNpNewInst(""); }
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-[10px] font-medium border-none cursor-pointer bg-surface-tertiary text-text-secondary hover:text-text-primary hover:bg-surface-tertiary/80 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div>
            <label className={lbl}>Custo por Aluno (R$)</label>
            <input type="number" value={npCost} onChange={(e) => setNpCost(e.target.value)} className={inp} />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={() => setShowAddProf(false)} className="px-4 py-2.5 rounded-lg text-xs font-medium border-none cursor-pointer bg-surface-tertiary text-text-secondary hover:text-text-primary">Cancelar</button>
          <button onClick={confirmAddProf} disabled={!npName.trim() || npInstIds.length === 0} className="flex-1 py-2.5 rounded-lg bg-accent-green text-surface-primary text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity border-none cursor-pointer">Cadastrar</button>
        </div>
      </Modal>

      {/* Modal Novo Aluno */}
      <Modal
        open={!!showAddStud}
        onOpenChange={(v) => { if (!v) { setShowAddStud(null); setNsExisting(false); setNsPersonId(""); } }}
        title="Novo Aluno"
        size="sm"
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer select-none py-1">
            <input type="checkbox" checked={nsExisting} onChange={(e) => { setNsExisting(e.target.checked); if (!e.target.checked) { setNsPersonId(""); setNsName(""); } }} className="accent-accent-blue w-3.5 h-3.5" />
            <span className="text-[11px] font-medium text-text-primary">Aluno já matriculado em outro curso</span>
          </label>
          {nsExisting ? (
            <div>
              <label className={lbl}>Selecionar aluno existente</label>
              <Select
                value={nsPersonId}
                onValueChange={(val) => {
                  setNsPersonId(val);
                  const allStudents = data.professors.flatMap(p => p.students.map(s => ({ ...s, profName: p.name })));
                  const match = allStudents.find(s => s.personId === val);
                  if (match) setNsName(match.name);
                }}
                options={(() => {
                  const currentProfStudentIds = new Set((data.professors.find(p => p.id === showAddStud)?.students || []).map(s => s.personId || s.id));
                  const seen = new Set<string>();
                  const opts: { value: string; label: string }[] = [];
                  data.professors.forEach(p => {
                    p.students.forEach(s => {
                      const pid = s.personId || s.id;
                      if (s.situation === "Ativo" && !currentProfStudentIds.has(pid) && !seen.has(pid)) {
                        seen.add(pid);
                        opts.push({ value: pid, label: `${s.name} (${s.instrumentName || "—"} - Prof. ${p.name})` });
                      }
                    });
                  });
                  return opts;
                })()}
                placeholder="Selecionar aluno..."
              />
            </div>
          ) : (
            <div>
              <label className={lbl}>Nome</label>
              <input value={nsName} onChange={(e) => setNsName(e.target.value)} className={inp} placeholder="Ex: Ana Clara" autoFocus />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Horário</label>
              <input value={nsHour} onChange={(e) => setNsHour(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Dia</label>
              <Select
                value={nsDay}
                onValueChange={setNsDay}
                options={DAY_OPTIONS}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Curso (Instrumento)</label>
            <Select
              value={nsInstId}
              onValueChange={setNsInstId}
              options={(() => {
                const profObj = data.professors.find(p => p.id === showAddStud);
                const profInstIds = profObj?.instruments.map(i => i.id) || [];
                const filtered = profInstIds.length > 0 ? instruments.filter(i => profInstIds.includes(i.id)) : instruments;
                return filtered.map(i => ({ value: i.id, label: i.name }));
              })()}
              placeholder="Selecionar curso..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Mensalidade (R$)</label>
              <input type="number" value={nsVal} onChange={(e) => setNsVal(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Dia de Vencimento</label>
              <Select
                value={nsDueDay}
                onValueChange={setNsDueDay}
                options={Array.from({ length: 31 }, (_, i) => ({ value: (i + 1).toString(), label: `Dia ${i + 1}` }))}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Forma de Pagamento</label>
            <Select
              value={nsPayMethod}
              onValueChange={setNsPayMethod}
              options={[
                { value: "Boleto", label: "Boleto" },
                { value: "Dinheiro", label: "Dinheiro" },
                { value: "Pix", label: "Pix" },
                { value: "Crédito Recorrente", label: "Crédito Recorrente" },
                { value: "Cartão de Débito", label: "Cartão de Débito" },
                { value: "Cartão de Crédito", label: "Cartão de Crédito" }
              ]}
              placeholder="Selecionar forma de pagamento..."
            />
          </div>
          <div>
            <label className={lbl}>Data de Matrícula</label>
            <DatePicker value={nsEnroll} onChange={setNsEnroll} />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={() => setShowAddStud(null)} className="px-4 py-2.5 rounded-lg text-xs font-medium border-none cursor-pointer bg-surface-tertiary text-text-secondary hover:text-text-primary">Cancelar</button>
          <button onClick={() => showAddStud && confirmAddStudent(showAddStud)} disabled={nsSubmitting} className="flex-1 py-2.5 rounded-lg bg-accent-green text-surface-primary text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {nsSubmitting ? "Cadastrando..." : "Cadastrar Aluno"}
          </button>
        </div>
      </Modal>

      {/* Modal Editar Aluno */}
      <Modal
        open={!!editStudent}
        onOpenChange={(v) => { if (!v) setEditStudent(null); }}
        title="Detalhes do Aluno"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className={lbl}>Nome</label>
            <input value={esName} onChange={(e) => setEsName(e.target.value)} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Dia da Aula</label>
              <Select
                value={esDay || "Seg"}
                onValueChange={setEsDay}
                options={DAY_OPTIONS}
              />
            </div>
            <div>
              <label className={lbl}>Horário</label>
              <input value={esHour} onChange={(e) => setEsHour(e.target.value)} className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Situação</label>
              <Select
                value={esSit || "Ativo"}
                onValueChange={setEsSit}
                options={situationOptions}
              />
            </div>
            <div>
              <label className={lbl}>Curso (Instrumento)</label>
              <Select
                value={esInstId}
                onValueChange={setEsInstId}
                options={instruments.map(i => ({ value: i.id, label: i.name }))}
                placeholder="Selecionar..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Mensalidade (R$)</label>
              <input type="number" value={esTuition} onChange={(e) => setEsTuition(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Dia de Vencimento</label>
              <Select
                value={esDueDay}
                onValueChange={setEsDueDay}
                options={Array.from({ length: 31 }, (_, i) => ({ value: (i + 1).toString(), label: `Dia ${i + 1}` }))}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Forma de Pagamento</label>
            <Select
              value={esPayMethod}
              onValueChange={setEsPayMethod}
              options={[
                { value: "Boleto", label: "Boleto" },
                { value: "Dinheiro", label: "Dinheiro" },
                { value: "Pix", label: "Pix" },
                { value: "Crédito Recorrente", label: "Crédito Recorrente" },
                { value: "Cartão de Débito", label: "Cartão de Débito" },
                { value: "Cartão de Crédito", label: "Cartão de Crédito" }
              ]}
              placeholder="Selecionar forma de pagamento..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Data de Matrícula</label>
              <DatePicker value={esEnroll} onChange={setEsEnroll} />
            </div>
            <div>
              <label className={lbl}>Data de Saída</label>
              <DatePicker value={editStudent?.exitDate || ""} onChange={() => {}} readOnly disabled={esSit === "Ativo"} />
            </div>
          </div>
          {/* <div className="border-t border-border-primary pt-4">
            <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-3">Contato</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Telefone do Aluno</label>
                <input value={esPhone} onChange={(e) => setEsPhone(e.target.value)} className={inp} placeholder="(11) 99999-0000" />
              </div>
              <div>
                <label className={lbl}>Nome do Responsável</label>
                <input value={esRespName} onChange={(e) => setEsRespName(e.target.value)} className={inp} placeholder="Ex: Maria Silva" />
              </div>
            </div>
            <div className="mt-3">
              <label className={lbl}>Telefone do Responsável</label>
              <input value={esRespPhone} onChange={(e) => setEsRespPhone(e.target.value)} className={inp} placeholder="(11) 99999-0000" />
            </div>
          </div> */}
          <div className="rounded-lg p-3 border border-border-secondary bg-surface-tertiary">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Tempo de Permanência</span>
              <span className="text-xs font-mono font-medium text-accent-blue">{calcPermanencia(esEnroll || editStudent?.enrollmentDate)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Professor</span>
              <span className="text-[11px] text-text-primary">{prof?.name} ({prof?.instruments.length > 0 ? prof.instruments.map(i => i.name).join(", ") : prof?.instrument})</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={() => setEditStudent(null)} className="px-4 py-2.5 rounded-lg text-xs font-medium border-none cursor-pointer bg-surface-tertiary text-text-secondary hover:text-text-primary">Cancelar</button>
          <button onClick={saveEditStudent} className="flex-1 py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer">Salvar Alterações</button>
        </div>
      </Modal>

      {/* Edit Professor Modal */}
      <Modal
        open={!!editProf}
        onOpenChange={(v) => { if (!v) setEditProf(null); }}
        title="Editar Professor"
        size="md"
      >
        {editProf && (() => {
          const ep = data.professors.find(p => p.id === editProf);
          if (!ep) return null;
          const availableInsts = instruments.filter(i => !ep.instruments.some(pi => pi.id === i.id));
          return (
            <div className="space-y-4">
              <AvatarUploader
                currentUrl={ep.avatarUrl}
                fallbackUrl={getAvatar(ep.name)}
                onCropped={(blob) => setEpAvatarBlob(blob)}
                onRemove={() => { setEpAvatarRemoved(true); setEpAvatarBlob(null); }}
              />
              <div>
                <label className={lbl}>Nome</label>
                <input value={epName} onChange={(e) => setEpName(e.target.value)} className={inp} autoFocus />
              </div>
              <div>
                <label className={lbl}>Custo por Aluno (R$)</label>
                <input type="number" value={epCost} onChange={(e) => setEpCost(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Instrumentos</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ep.instruments.map((inst) => (
                    <span key={inst.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-surface-tertiary text-text-primary border border-border-secondary">
                      {inst.name}
                      <button onClick={() => handleRemoveProfessorInstrument(editProf, inst.id)} className="border-none bg-transparent cursor-pointer p-0 text-text-tertiary hover:text-accent-red">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {ep.instruments.length === 0 && <span className="text-[10px] text-text-tertiary">Nenhum instrumento</span>}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      value=""
                      onValueChange={(v) => { if (v) handleAddProfessorInstrument(editProf, v); }}
                      options={availableInsts.map(i => ({ value: i.id, label: i.name }))}
                      placeholder="Adicionar instrumento..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    value={epNewInst}
                    onChange={(e) => setEpNewInst(e.target.value)}
                    className={cn(inp, "flex-1")}
                    placeholder="Novo instrumento..."
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && epNewInst.trim()) {
                        const inst = await handleAddInstrument(epNewInst.trim());
                        if (inst) { await handleAddProfessorInstrument(editProf, inst.id); setEpNewInst(""); }
                      }
                    }}
                  />
                  <button
                    onClick={async () => {
                      if (epNewInst.trim()) {
                        const inst = await handleAddInstrument(epNewInst.trim());
                        if (inst) { await handleAddProfessorInstrument(editProf, inst.id); setEpNewInst(""); }
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-medium border-none cursor-pointer bg-surface-tertiary text-text-secondary hover:text-text-primary hover:bg-surface-tertiary/80 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <button
                onClick={saveEditProf}
                className="w-full py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer mt-2"
              >
                Salvar Alterações
              </button>
            </div>
          );
        })()}
      </Modal>

      {/* Payment Popover Modal */}
      <Modal
        open={!!payPopover}
        onOpenChange={(v) => { if (!v) setPayPopover(null); }}
        title={payPopover ? `${MF[payPopover.month]} ${data.config.year}` : ""}
        size="sm"
      >
        {payPopover && (() => {
          const ds = getDisplayStatus(payPopover.student, payPopover.month);
          const statusBadge = {
            PAID: { label: "Pago", cls: "bg-accent-green/10 text-accent-green" },
            PENDING: { label: "Pendente", cls: "bg-accent-amber/10 text-accent-amber" },
            LATE: { label: "Em Atraso", cls: "bg-accent-red/10 text-accent-red" },
            WAIVED: { label: "Isento", cls: "bg-surface-tertiary text-text-tertiary" },
            FUTURE: { label: "Previsto", cls: "bg-surface-tertiary text-text-tertiary" },
          }[ds];
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Status atual</span>
                <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-medium", statusBadge.cls)}>{statusBadge.label}</span>
              </div>
              <div>
                <label className={lbl}>Previsto</label>
                <p className="text-sm font-mono font-bold text-text-primary">{brl(payPopover.tuition)}</p>
              </div>
              {ds !== "PAID" && ds !== "WAIVED" && (
                <div>
                  <label className={lbl}>Valor pago (R$)</label>
                  <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inp} autoFocus />
                </div>
              )}
              <div className="flex flex-col gap-2 mt-4">
                {ds !== "PAID" && ds !== "WAIVED" && (
                  <button
                    onClick={() => { handleConfirmPayment(payPopover.profId, payPopover.student.id, payPopover.month, Number(payAmount) || payPopover.tuition); setPayPopover(null); }}
                    className="w-full py-2.5 rounded-lg bg-accent-green text-surface-primary text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer"
                  >
                    Confirmar Pagamento
                  </button>
                )}
                {ds !== "WAIVED" && (
                  <button
                    onClick={() => { handleWaivePayment(payPopover.profId, payPopover.student.id, payPopover.month); setPayPopover(null); }}
                    className="w-full py-2.5 rounded-lg bg-surface-tertiary text-text-primary text-xs font-medium hover:bg-surface-tertiary/80 transition-colors border border-border-secondary cursor-pointer"
                  >
                    Isentar Mensalidade
                  </button>
                )}
                {(ds === "PAID" || ds === "WAIVED") && (
                  <button
                    onClick={() => { handleRevertPayment(payPopover.profId, payPopover.student.id, payPopover.month, payPopover.tuition); setPayPopover(null); }}
                    className="w-full py-2.5 rounded-lg bg-accent-amber/10 text-accent-amber text-xs font-medium hover:bg-accent-amber/20 transition-colors border border-border-secondary cursor-pointer"
                  >
                    Reverter para Pendente
                  </button>
                )}
                <button
                  onClick={() => setPayPopover(null)}
                  className="w-full py-2.5 rounded-lg bg-surface-primary text-text-secondary text-xs font-medium hover:text-text-primary transition-colors border border-transparent cursor-pointer mt-2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Statement Modal */}
      <Modal
        open={showStatement && !!prof}
        onOpenChange={(v) => { if (!v) setShowStatement(false); }}
        title="Extrato do Professor"
        size="lg"
      >
        {prof && (
          <ProfessorStatement
            professor={prof}
            month={curMo}
            year={data.config.year}
            schoolName={data.config.schoolName}
            onClose={() => setShowStatement(false)}
          />
        )}
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmState.open}
        onOpenChange={confirmClose}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
      />

      {/* Bulk Delete Floating Bar */}
      {/* Bulk Delete Floating Bar (Students) */}
      {bulkDeleteMode && bulkDeleteSelected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-accent-red text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{bulkDeleteSelected.size} aluno(s) selecionado(s)</span>
          <button
            onClick={confirmBulkDelete}
            disabled={bulkDeleting}
            className="bg-white text-accent-red px-4 py-1.5 rounded-lg font-semibold text-sm hover:bg-red-50 disabled:opacity-50 transition-colors border-none cursor-pointer"
          >
            {bulkDeleting ? "Excluindo..." : "Excluir"}
          </button>
          <button
            onClick={() => {
              setBulkDeleteMode(false);
              setBulkDeleteSelected(new Set());
            }}
            className="text-red-100 hover:text-white transition-colors border-none bg-transparent cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Bulk Delete Floating Bar (Professors) */}
      {bulkProfDeleteMode && bulkProfSelected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-accent-red text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{bulkProfSelected.size} professor(es) selecionado(s)</span>
          <button
            onClick={confirmBulkProfDelete}
            disabled={bulkProfDeleting}
            className="bg-white text-accent-red px-4 py-1.5 rounded-lg font-semibold text-sm hover:bg-red-50 disabled:opacity-50 transition-colors border-none cursor-pointer"
          >
            {bulkProfDeleting ? "Excluindo..." : "Excluir"}
          </button>
          <button
            onClick={() => {
              setBulkProfDeleteMode(false);
              setBulkProfSelected(new Set());
            }}
            className="text-red-100 hover:text-white transition-colors border-none bg-transparent cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
