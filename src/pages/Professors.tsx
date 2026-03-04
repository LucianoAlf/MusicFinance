import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { MonthSelector } from "../components/MonthSelector";
import { KpiCard } from "../components/KpiCard";
import { Select, DatePicker, Modal, ConfirmModal, useConfirm } from "../components/ui";
import { brl, pct, MS, MF, cn } from "../lib/utils";
import type { Student, Instrument, Payment, DisplayStatus } from "../types";
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
} from "lucide-react";

const SITUATIONS = ["Ativo", "Evadido", "Trancado"] as const;

const sitStyle = (sit: string, dark: boolean) => {
  switch (sit) {
    case "Ativo":    return dark ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-700";
    case "Evadido":  return dark ? "bg-rose-900/30 text-rose-400"       : "bg-rose-50 text-rose-700";
    case "Trancado": return dark ? "bg-amber-900/30 text-amber-400"     : "bg-amber-50 text-amber-700";
    default:         return dark ? "bg-slate-700 text-slate-400"        : "bg-slate-100 text-slate-500";
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

export const Professors = () => {
  const {
    data, instruments, curMo, setCurMo, selProf, setSelProf, selPay, setSelPay,
    dark, viewKpis,
    handleAddProfessor, handleUpdateProfessor, handleDeleteProfessor,
    handleAddStudent, handleUpdateStudent, handleDeleteStudent,
    handleConfirmPayment, handleWaivePayment, handleRevertPayment,
    handleAddInstrument, handleAddProfessorInstrument, handleRemoveProfessorInstrument,
  } = useData();

  const [showAddProf, setShowAddProf] = useState(false);
  const [showAddStud, setShowAddStud] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editProf, setEditProf] = useState<string | null>(null);

  // Add professor form
  const [npName, setNpName] = useState("");
  const [npCost, setNpCost] = useState("100");
  const [npInstIds, setNpInstIds] = useState<string[]>([]);
  const [npNewInst, setNpNewInst] = useState("");

  // Add student form
  const [nsName, setNsName] = useState("");
  const [nsHour, setNsHour] = useState("14:00");
  const [nsDay, setNsDay] = useState("Seg");
  const [nsVal, setNsVal] = useState(data?.config.tuition.toString() || "358");
  const [nsEnroll, setNsEnroll] = useState(new Date().toISOString().split("T")[0]);
  const [nsInstId, setNsInstId] = useState("");
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

  // Edit professor modal state
  const [epName, setEpName] = useState("");
  const [epCost, setEpCost] = useState("");
  const [epNewInst, setEpNewInst] = useState("");

  const { state: confirmState, confirm, close: confirmClose } = useConfirm();

  // Payment popover state
  const [payPopover, setPayPopover] = useState<{ profId: string; studentId: string; month: number; payment: Payment | null; tuition: number } | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const getDisplayStatus = (pm: Payment | null, monthIdx: number): DisplayStatus => {
    if (!pm) return "FUTURE";
    if (pm.status === "PAID") return "PAID";
    if (pm.status === "WAIVED") return "WAIVED";
    if (monthIdx < curMo) return "LATE";
    if (monthIdx > curMo) return "FUTURE";
    return "PENDING";
  };

  if (!data) return null;

  // Situation options with colors (depends on dark)
  const situationOptions = SITUATIONS.map((sit) => ({
    value: sit,
    label: sit,
    color: sitStyle(sit, dark),
  }));

  const cd = cn(
    "rounded-2xl p-4 shadow-sm border",
    dark ? "bg-slate-800/80 border-slate-700/50" : "bg-white border-slate-100"
  );
  const inp = cn(
    "w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50",
    dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200"
  );
  const lbl = cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500");

  let _tP = data.professors.length,
    _tA = 0,
    _tR = 0,
    _tF = 0;
  const _paidPersonIds = new Set<string>();
  const _allPersonIds = new Set<string>();
  data.professors.forEach((p) => {
    _tA += p.students.length;
    let py = 0;
    p.students.forEach((s) => {
      _allPersonIds.add(s.personId || s.id);
      const pm = s.payments && s.payments[curMo];
      if (pm && pm.status === "PAID" && pm.amount > 0) { _tR += pm.amount; py++; _paidPersonIds.add(s.personId || s.id); }
    });
    _tF += py * p.costPerStudent;
  });
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
    await handleAddProfessor({ name: npName.trim(), instrument: firstInstName, costPerStudent: Number(npCost) || 100, instrumentIds: npInstIds });
    setShowAddProf(false);
    setNpName(""); setNpCost("100"); setNpInstIds([]); setNpNewInst("");
  };

  const confirmAddStudent = async (pid: string) => {
    if (!nsName.trim()) return;
    await handleAddStudent(pid, {
      name: nsName.trim(),
      day: nsDay,
      time: nsHour,
      tuition: Number(nsVal) || data.config.tuition,
      enrollmentDate: nsEnroll,
      instrumentId: nsInstId || undefined,
      personId: nsExisting && nsPersonId ? nsPersonId : undefined,
    });
    setShowAddStud(null);
    setNsName(""); setNsEnroll(new Date().toISOString().split("T")[0]); setNsInstId("");
    setNsExisting(false); setNsPersonId("");
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

  const openEditProf = (p: { id: string; name: string; costPerStudent: number }) => {
    setEditProf(p.id);
    setEpName(p.name);
    setEpCost(p.costPerStudent.toString());
    setEpNewInst("");
  };

  const saveEditProf = async () => {
    if (!editProf) return;
    const updates: { name?: string; costPerStudent?: number } = {};
    const currentProf = data.professors.find(p => p.id === editProf);
    if (!currentProf) return;
    if (epName.trim() && epName.trim() !== currentProf.name) updates.name = epName.trim();
    const newCost = Number(epCost);
    if (newCost > 0 && newCost !== currentProf.costPerStudent) updates.costPerStudent = newCost;
    if (Object.keys(updates).length > 0) await handleUpdateProfessor(editProf, updates);
    setEditProf(null);
  };

  const openPayPopover = (profId: string, s: Student, mi: number) => {
    const pm = s.payments[mi];
    const tuition = s.tuitionAmount || data.config.tuition;
    setPayPopover({ profId, studentId: s.id, month: mi, payment: pm, tuition });
    setPayAmount(pm ? pm.amount.toString() : tuition.toString());
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className={cn("text-2xl font-bold", dark ? "text-white" : "text-slate-900")}>Professores</h1>
            <p className={cn("text-xs mt-1", dark ? "text-slate-400" : "text-slate-500")}>
              {data.professors.length} profs · {data.professors.reduce((s, p) => s + p.students.length, 0)} alunos · {MF[curMo]}
            </p>
          </div>
          <MonthSelector curMo={curMo} setCurMo={setCurMo} />
        </div>
        <div className="flex justify-end">
          <button onClick={() => setShowAddProf(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-violet-500/25 hover:shadow-xl transition-all border-none cursor-pointer">
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
        <KpiCard icon={Activity} label="Media Al/Prof" value={_ma.toFixed(1)} color="blue" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <KpiCard icon={Clock} label="Permanência" value={avgTenure.toFixed(1) + " meses"} color="cyan" />
        <KpiCard icon={UserPlus} label={`Matrículas ${MS[curMo]}`} value={newEnrollments} color="teal" />
        <KpiCard icon={UserMinus} label={`Evasões ${MS[curMo]}`} value={churnedStudents} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
          {data.professors.map((p) => {
            const pay = p.students.filter((s) => { const pm = s.payments?.[curMo]; return pm && pm.status === "PAID" && pm.amount > 0; }).length;
            const rev = p.students.reduce((sum, s) => { const pm = s.payments?.[curMo]; return sum + (pm && pm.status === "PAID" ? pm.amount : 0); }, 0);
            const pp = rev > 0 ? (pay * p.costPerStudent) / rev : 0;
            const ticketProf = pay > 0 ? rev / pay : 0;
            const prevRev = curMo > 0 ? p.students.reduce((sum, s) => { const pm = s.payments?.[curMo - 1]; return sum + (pm && pm.status === "PAID" ? pm.amount : 0); }, 0) : null;
            const trendProf = prevRev != null && prevRev > 0 ? ((rev - prevRev) / prevRev) * 100 : null;
            const trendUp = trendProf != null && trendProf >= 0;

            return (
              <div key={p.id} onClick={() => { setSelProf(p.id); setSelPay(null); }}
                className={cn("rounded-xl p-3 cursor-pointer transition-all border",
                  selProf === p.id ? (dark ? "bg-violet-500/15 border-violet-500/30" : "bg-violet-50 border-violet-200 ring-1 ring-violet-100")
                    : (dark ? "bg-slate-800/60 border-slate-700/50 hover:bg-slate-800" : "bg-white border-slate-100 hover:bg-slate-50")
                )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                      selProf === p.id ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white" : (dark ? "bg-slate-700 text-slate-500" : "bg-slate-100 text-slate-400"))}>
                      <Music size={14} />
                    </div>
                    <div>
                      <p className={cn("text-xs font-semibold", dark ? "text-white" : "text-slate-900")}>{p.name}</p>
                      <p className={cn("text-[10px]", dark ? "text-slate-400" : "text-slate-500")}>{p.instruments.length > 0 ? p.instruments.map(i => i.name).join(", ") : p.instrument} · {p.students.length} al. · {pay} pag.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <p className={cn("text-xs font-bold", dark ? "text-emerald-400" : "text-emerald-600")}>{brl(rev)}</p>
                      {trendProf != null && (
                        <span className={cn("text-[9px] flex items-center", trendUp ? (dark ? "text-emerald-400" : "text-emerald-600") : (dark ? "text-rose-400" : "text-rose-600"))}>
                          {trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{Math.abs(trendProf).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className={cn("text-[10px]", pp > 0.45 ? "text-rose-500 font-semibold" : (dark ? "text-slate-400" : "text-slate-500"))}>{pct(pp)} folha</p>
                    <p className={cn("text-[9px]", dark ? "text-teal-400" : "text-teal-600")}>Ticket: {brl(ticketProf)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {prof ? (
            <div className={cd}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
                    <Music size={18} />
                  </div>
                  <div>
                    <button
                      onClick={() => openEditProf(prof)}
                      className={cn("font-bold text-sm border-none bg-transparent cursor-pointer p-0 text-left transition-colors", dark ? "text-white hover:text-violet-400" : "text-slate-900 hover:text-violet-600")}
                    >{prof.name}</button>
                    <p className={cn("text-[11px]", dark ? "text-slate-400" : "text-slate-500")}>
                      {prof.instruments.length > 0 ? prof.instruments.map(i => i.name).join(", ") : prof.instrument} · R$ {prof.costPerStudent}/aluno · {prof.students.length} alunos · {prof.students.filter((s) => { const pm = s.payments?.[curMo]; return pm && pm.status === "PAID" && pm.amount > 0; }).length} pagantes
                    </p>
                    <p className={cn("text-[10px] font-semibold", dark ? "text-emerald-400" : "text-emerald-600")}>
                      Receita {MS[curMo]}: {brl(prof.students.reduce((sum, s) => { const pm = s.payments?.[curMo]; return sum + (pm && pm.status === "PAID" ? pm.amount : 0); }, 0))}
                      <span className={cn("ml-2", dark ? "text-teal-400" : "text-teal-600")}>
                        Ticket: {brl((() => { const payP = prof.students.filter((s) => { const pm = s.payments?.[curMo]; return pm && pm.status === "PAID" && pm.amount > 0; }).length; const revP = prof.students.reduce((sum, s) => { const pm = s.payments?.[curMo]; return sum + (pm && pm.status === "PAID" ? pm.amount : 0); }, 0); return payP > 0 ? revP / payP : 0; })())}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddStud(prof.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold hover:bg-emerald-500/20 transition-all border border-emerald-500/20 cursor-pointer">
                    <UserPlus size={14} /> Novo Aluno
                  </button>
                  <button onClick={() => removeProf(prof.id)} className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all border border-rose-500/20 cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[58vh]">
                <table className="w-full text-[11px]">
                  <thead className={cn("sticky top-0 z-10", dark ? "bg-slate-800" : "bg-white")}>
                    <tr className={cn("border-b", dark ? "text-slate-400 border-slate-700" : "text-slate-500 border-slate-200")}>
                      <th className="text-left py-2.5 px-2 font-semibold">Nome</th>
                      <th className="text-left py-2.5 px-1 w-16 font-semibold">Curso</th>
                      <th className="text-center py-2.5 px-1 w-14 font-semibold">Perm.</th>
                      <th className="text-center py-2.5 px-1 w-12 font-semibold">Hora</th>
                      <th className="text-center py-2.5 px-1 w-10 font-semibold">Dia</th>
                      <th className="text-left py-2.5 px-1 w-20 font-semibold">Situação</th>
                      <th className="w-10 text-center py-2.5 font-semibold">Pgto</th>
                      <th className="w-8 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {prof.students.map((s) => {
                      const isInactive = s.situation !== "Ativo";
                      return (
                        <React.Fragment key={s.id}>
                          <tr className={cn("border-t transition-colors", dark ? "border-slate-700/30 hover:bg-slate-700/20" : "border-slate-100 hover:bg-slate-50")}>
                            <td className={cn("py-2 px-2", isInactive && "opacity-50")}>
                              <button
                                onClick={() => openEditStudent(s)}
                                className={cn(
                                  "border-none bg-transparent cursor-pointer p-0 text-left font-medium transition-colors",
                                  dark ? "text-white hover:text-violet-400" : "text-slate-800 hover:text-violet-600",
                                  s.situation === "Evadido" && "line-through"
                                )}
                              >
                                {s.name}
                              </button>
                            </td>
                            <td className={cn("py-2 px-1 text-left text-[10px]", dark ? "text-slate-400" : "text-slate-500", isInactive && "opacity-50")}>
                              {s.instrumentName || "—"}
                            </td>
                            <td className={cn("py-2 px-1 text-center text-[10px]", dark ? "text-slate-500" : "text-slate-400", isInactive && "opacity-50")}>
                              {calcPermanencia(s.enrollmentDate)}
                            </td>
                            <td className={cn("py-2 px-1 text-center", dark ? "text-slate-400" : "text-slate-500", isInactive && "opacity-50")}>{s.hour || "—"}</td>
                            <td className={cn("py-2 px-1 text-center", dark ? "text-slate-400" : "text-slate-500", isInactive && "opacity-50")}>{s.day || "—"}</td>
                            <td className="py-1.5 px-1 text-left">
                              <Select
                                value={s.situation || "Ativo"}
                                onValueChange={(v) => changeSituation(s.id, v)}
                                options={situationOptions}
                                dark={dark}
                                compact
                              />
                            </td>
                            <td className="py-2 text-center">
                              <button onClick={() => setSelPay(selPay === s.id ? null : s.id)}
                                className={cn("px-2 py-1 rounded-lg text-[10px] font-medium transition-all border-none cursor-pointer",
                                  selPay === s.id ? (dark ? "bg-violet-500/20 text-violet-400" : "bg-violet-100 text-violet-700") : (dark ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"))}>
                                {selPay === s.id ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                              </button>
                            </td>
                            <td className="py-2 text-center">
                              <button onClick={() => removeStudent(prof.id, s.id)} className="p-1 rounded-lg text-rose-400 hover:text-rose-600 transition-all border-none bg-transparent cursor-pointer">
                                <X size={12} />
                              </button>
                            </td>
                          </tr>
                          {selPay === s.id && (
                            <tr>
                              <td colSpan={8}>
                                <div className={cn("p-3 my-1 rounded-xl border", dark ? "bg-slate-700/40 border-slate-600/30" : "bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-100")}>
                                  <p className={cn("text-[10px] font-semibold mb-2 flex items-center gap-1.5", dark ? "text-violet-400" : "text-violet-700")}>
                                    <Calendar size={12} /> Pagamentos {data.config.year}
                                  </p>
                                  <div className="grid grid-cols-12 gap-1.5">
                                    {MS.map((m, mi) => {
                                      const pm = s.payments[mi];
                                      const ds = getDisplayStatus(pm, mi);
                                      const cellColor = {
                                        PAID: dark ? "bg-emerald-900/25 border-emerald-600/40 text-emerald-400" : "bg-emerald-50 border-emerald-300 text-emerald-700",
                                        PENDING: dark ? "bg-amber-900/25 border-amber-600/40 text-amber-400" : "bg-amber-50 border-amber-300 text-amber-700",
                                        LATE: dark ? "bg-rose-900/25 border-rose-600/40 text-rose-400" : "bg-rose-50 border-rose-300 text-rose-600",
                                        WAIVED: dark ? "bg-slate-700/50 border-slate-600/40 text-slate-500" : "bg-slate-100 border-slate-200 text-slate-400",
                                        FUTURE: dark ? "bg-slate-700/30 border-slate-600/30 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-400",
                                      }[ds];
                                      const statusLabel = { PAID: "Pago", PENDING: "Pend.", LATE: "Atraso", WAIVED: "Isento", FUTURE: "Prev." }[ds];
                                      return (
                                        <div key={m} className="text-center">
                                          <label className={cn("text-[9px] font-semibold", dark ? "text-slate-400" : "text-slate-500", mi === curMo && (dark ? "text-violet-400" : "text-violet-600"))}>{m}</label>
                                          <button
                                            onClick={() => openPayPopover(prof.id, s, mi)}
                                            className={cn("w-full text-center text-[10px] px-0.5 py-1 rounded-lg border-2 cursor-pointer transition-all", cellColor, mi === curMo && (dark ? "ring-1 ring-violet-500/50" : "ring-1 ring-violet-400"))}
                                          >
                                            <div className="font-semibold">{pm ? (ds === "WAIVED" ? "—" : pm.amount) : "—"}</div>
                                            <div className="text-[8px] opacity-75">{statusLabel}</div>
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
            <div className={cn(cd, "flex flex-col items-center justify-center h-64 gap-3")}>
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", dark ? "bg-slate-700 text-slate-500" : "bg-slate-100 text-slate-300")}><Users size={28} /></div>
              <p className={cn("text-sm", dark ? "text-slate-500" : "text-slate-400")}>Selecione um professor à esquerda</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Professor */}
      <Modal
        open={showAddProf}
        onOpenChange={(v) => { if (!v) setShowAddProf(false); }}
        title="Novo Professor"
        dark={dark}
        size="sm"
      >
        <div className="space-y-3">
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
                  <span key={iid} className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium", dark ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-violet-100 text-violet-700 border border-violet-200")}>
                    {inst?.name}
                    <button onClick={() => setNpInstIds(prev => prev.filter(id => id !== iid))} className="border-none bg-transparent cursor-pointer p-0 text-current opacity-60 hover:opacity-100"><X size={10} /></button>
                  </span>
                );
              })}
            </div>
            <Select
              value=""
              onValueChange={(v) => { if (v && !npInstIds.includes(v)) setNpInstIds(prev => [...prev, v]); }}
              options={instruments.filter(i => !npInstIds.includes(i.id)).map(i => ({ value: i.id, label: i.name }))}
              placeholder="Selecionar instrumento..."
              dark={dark}
            />
            <div className="flex gap-1.5 mt-1.5">
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
                className={cn("px-2 py-1.5 rounded-lg text-[10px] font-semibold border-none cursor-pointer", dark ? "bg-slate-600 text-slate-300 hover:bg-slate-500" : "bg-slate-200 text-slate-600 hover:bg-slate-300")}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          <div>
            <label className={lbl}>Custo por Aluno (R$)</label>
            <input type="number" value={npCost} onChange={(e) => setNpCost(e.target.value)} className={inp} />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={confirmAddProf} disabled={!npName.trim() || npInstIds.length === 0} className={cn("flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-semibold shadow-lg border-none cursor-pointer", (!npName.trim() || npInstIds.length === 0) && "opacity-50 cursor-not-allowed")}>Cadastrar</button>
          <button onClick={() => setShowAddProf(false)} className={cn("px-4 py-2.5 rounded-xl text-xs font-medium border-none cursor-pointer", dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600")}>Cancelar</button>
        </div>
      </Modal>

      {/* Modal Novo Aluno */}
      <Modal
        open={!!showAddStud}
        onOpenChange={(v) => { if (!v) { setShowAddStud(null); setNsExisting(false); setNsPersonId(""); } }}
        title="Novo Aluno"
        dark={dark}
        size="sm"
      >
        <div className="space-y-3">
          <label className={cn("flex items-center gap-2 cursor-pointer select-none py-1")}>
            <input type="checkbox" checked={nsExisting} onChange={(e) => { setNsExisting(e.target.checked); if (!e.target.checked) { setNsPersonId(""); setNsName(""); } }} className="accent-violet-500 w-3.5 h-3.5" />
            <span className={cn("text-[11px] font-medium", dark ? "text-slate-300" : "text-slate-600")}>Aluno já matriculado em outro curso</span>
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
                dark={dark}
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
                dark={dark}
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
              dark={dark}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Mensalidade (R$)</label>
              <input type="number" value={nsVal} onChange={(e) => setNsVal(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Data de Matrícula</label>
              <DatePicker value={nsEnroll} onChange={setNsEnroll} dark={dark} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => showAddStud && confirmAddStudent(showAddStud)} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold shadow-lg border-none cursor-pointer">Cadastrar Aluno</button>
          <button onClick={() => setShowAddStud(null)} className={cn("px-4 py-2.5 rounded-xl text-xs font-medium border-none cursor-pointer", dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600")}>Cancelar</button>
        </div>
      </Modal>

      {/* Modal Editar Aluno */}
      <Modal
        open={!!editStudent}
        onOpenChange={(v) => { if (!v) setEditStudent(null); }}
        title="Detalhes do Aluno"
        dark={dark}
        size="md"
      >
        <div className="space-y-3">
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
                dark={dark}
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
                dark={dark}
              />
            </div>
            <div>
              <label className={lbl}>Curso (Instrumento)</label>
              <Select
                value={esInstId}
                onValueChange={setEsInstId}
                options={instruments.map(i => ({ value: i.id, label: i.name }))}
                placeholder="Selecionar..."
                dark={dark}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Mensalidade (R$)</label>
              <input type="number" value={esTuition} onChange={(e) => setEsTuition(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Data de Matrícula</label>
              <DatePicker value={esEnroll} onChange={setEsEnroll} dark={dark} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Data de Saída</label>
              <DatePicker value={editStudent?.exitDate || ""} onChange={() => {}} readOnly dark={dark} />
            </div>
          </div>
          <div className={cn("rounded-lg p-3 border", dark ? "bg-slate-700/40 border-slate-600/30" : "bg-slate-50 border-slate-200")}>
            <div className="flex items-center justify-between">
              <span className={cn("text-[10px] font-semibold", dark ? "text-slate-400" : "text-slate-500")}>Tempo de Permanência</span>
              <span className={cn("text-xs font-bold", dark ? "text-cyan-400" : "text-cyan-600")}>{calcPermanencia(esEnroll || editStudent?.enrollmentDate)}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className={cn("text-[10px] font-semibold", dark ? "text-slate-400" : "text-slate-500")}>Professor</span>
              <span className={cn("text-xs", dark ? "text-slate-300" : "text-slate-600")}>{prof?.name} ({prof?.instruments.length > 0 ? prof.instruments.map(i => i.name).join(", ") : prof?.instrument})</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={saveEditStudent} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-bold shadow-lg border-none cursor-pointer">Salvar</button>
          <button onClick={() => setEditStudent(null)} className={cn("px-4 py-2.5 rounded-xl text-xs font-medium border-none cursor-pointer", dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600")}>Cancelar</button>
        </div>
      </Modal>

      {/* Edit Professor Modal */}
      <Modal
        open={!!editProf}
        onOpenChange={(v) => { if (!v) setEditProf(null); }}
        title="Editar Professor"
        dark={dark}
        size="md"
      >
        {editProf && (() => {
          const ep = data.professors.find(p => p.id === editProf);
          if (!ep) return null;
          const availableInsts = instruments.filter(i => !ep.instruments.some(pi => pi.id === i.id));
          return (
            <div className="space-y-4">
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
                    <span key={inst.id} className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold", dark ? "bg-violet-900/30 text-violet-400" : "bg-violet-100 text-violet-700")}>
                      {inst.name}
                      <button onClick={() => handleRemoveProfessorInstrument(editProf, inst.id)} className="border-none bg-transparent cursor-pointer p-0 text-current opacity-60 hover:opacity-100">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {ep.instruments.length === 0 && <span className={cn("text-[10px]", dark ? "text-slate-500" : "text-slate-400")}>Nenhum instrumento</span>}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      value=""
                      onValueChange={(v) => { if (v) handleAddProfessorInstrument(editProf, v); }}
                      options={availableInsts.map(i => ({ value: i.id, label: i.name }))}
                      placeholder="Adicionar instrumento..."
                      dark={dark}
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
                    className={cn("px-3 py-2 rounded-xl text-[10px] font-semibold border-none cursor-pointer", dark ? "bg-violet-600 text-white" : "bg-violet-500 text-white")}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
              <button
                onClick={saveEditProf}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-bold shadow-lg border-none cursor-pointer"
              >
                Salvar
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
        dark={dark}
        size="sm"
      >
        {payPopover && (() => {
          const ds = getDisplayStatus(payPopover.payment, payPopover.month);
          const statusBadge = {
            PAID: { label: "Pago", cls: dark ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-700" },
            PENDING: { label: "Pendente", cls: dark ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-700" },
            LATE: { label: "Em Atraso", cls: dark ? "bg-rose-900/30 text-rose-400" : "bg-rose-100 text-rose-700" },
            WAIVED: { label: "Isento", cls: dark ? "bg-slate-700 text-slate-400" : "bg-slate-200 text-slate-500" },
            FUTURE: { label: "Previsto", cls: dark ? "bg-slate-700 text-slate-400" : "bg-slate-200 text-slate-500" },
          }[ds];
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={cn("text-[10px] font-semibold", dark ? "text-slate-400" : "text-slate-500")}>Status atual</span>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", statusBadge.cls)}>{statusBadge.label}</span>
              </div>
              <div>
                <label className={lbl}>Previsto</label>
                <p className={cn("text-sm font-bold", dark ? "text-white" : "text-slate-800")}>{brl(payPopover.tuition)}</p>
              </div>
              {ds !== "PAID" && ds !== "WAIVED" && (
                <div>
                  <label className={lbl}>Valor pago (R$)</label>
                  <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inp} autoFocus />
                </div>
              )}
              <div className="flex flex-col gap-2">
                {ds !== "PAID" && ds !== "WAIVED" && (
                  <button
                    onClick={() => { handleConfirmPayment(payPopover.profId, payPopover.studentId, payPopover.month, Number(payAmount) || payPopover.tuition); setPayPopover(null); }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold shadow-lg border-none cursor-pointer"
                  >
                    Confirmar Pagamento
                  </button>
                )}
                {ds !== "WAIVED" && (
                  <button
                    onClick={() => { handleWaivePayment(payPopover.profId, payPopover.studentId, payPopover.month); setPayPopover(null); }}
                    className={cn("w-full py-2 rounded-xl text-xs font-medium border-none cursor-pointer", dark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                  >
                    Isentar (Bolsa)
                  </button>
                )}
                {(ds === "PAID" || ds === "WAIVED") && (
                  <button
                    onClick={() => { handleRevertPayment(payPopover.profId, payPopover.studentId, payPopover.month, payPopover.tuition); setPayPopover(null); }}
                    className={cn("w-full py-2 rounded-xl text-xs font-medium border-none cursor-pointer", dark ? "bg-amber-900/30 text-amber-400 hover:bg-amber-900/50" : "bg-amber-50 text-amber-700 hover:bg-amber-100")}
                  >
                    Reverter para Pendente
                  </button>
                )}
                <button
                  onClick={() => setPayPopover(null)}
                  className={cn("w-full py-2 rounded-xl text-xs font-medium border-none cursor-pointer", dark ? "bg-slate-700 text-slate-400" : "bg-slate-50 text-slate-500")}
                >
                  Cancelar
                </button>
              </div>
            </div>
          );
        })()}
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
        dark={dark}
      />
    </div>
  );
};
