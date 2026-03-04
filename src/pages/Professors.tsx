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

export const Professors = () => {
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
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Professores</h1>
            <p className="text-xs mt-1 text-text-secondary">
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
                  selProf === p.id 
                    ? "bg-surface-tertiary border-border-hover ring-1 ring-border-hover" 
                    : "bg-surface-secondary border-border-primary hover:bg-surface-tertiary/50 hover:border-border-secondary"
                )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                      selProf === p.id ? "bg-accent-blue text-surface-primary" : "bg-surface-tertiary text-text-tertiary")}>
                      <Music size={14} />
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
                  <div className="w-12 h-12 rounded-lg bg-surface-tertiary flex items-center justify-center text-text-tertiary border border-border-secondary">
                    <Music size={20} strokeWidth={2} />
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
                  <button onClick={() => setShowAddStud(prof.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-tertiary text-text-primary text-[11px] font-medium hover:bg-surface-tertiary/80 transition-all border border-border-secondary cursor-pointer">
                    <UserPlus size={14} /> Novo Aluno
                  </button>
                  <button onClick={() => removeProf(prof.id)} className="p-2 rounded-lg bg-transparent text-text-tertiary hover:bg-accent-red/10 hover:text-accent-red transition-all border border-border-secondary cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[58vh] mt-6">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-surface-secondary">
                    <tr>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-2 border-b border-border-primary font-medium">Nome</th>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-1 w-16 border-b border-border-primary font-medium">Curso</th>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-1 w-14 text-center border-b border-border-primary font-medium">Perm.</th>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-1 w-12 text-center border-b border-border-primary font-medium">Hora</th>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-1 w-10 text-center border-b border-border-primary font-medium">Dia</th>
                      <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 px-1 w-24 border-b border-border-primary font-medium">Situação</th>
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
                              <td colSpan={8}>
                                <div className="p-4 my-2 rounded-xl border border-border-secondary bg-surface-primary">
                                  <p className="text-[10px] font-semibold mb-3 uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                                    <Calendar size={12} /> Pagamentos {data.config.year}
                                  </p>
                                  <div className="grid grid-cols-12 gap-2">
                                    {MS.map((m, mi) => {
                                      const pm = s.payments[mi];
                                      const ds = getDisplayStatus(pm, mi);
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
              <label className={lbl}>Data de Matrícula</label>
              <DatePicker value={nsEnroll} onChange={setNsEnroll} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={() => setShowAddStud(null)} className="px-4 py-2.5 rounded-lg text-xs font-medium border-none cursor-pointer bg-surface-tertiary text-text-secondary hover:text-text-primary">Cancelar</button>
          <button onClick={() => showAddStud && confirmAddStudent(showAddStud)} className="flex-1 py-2.5 rounded-lg bg-accent-green text-surface-primary text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer">Cadastrar Aluno</button>
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
              <label className={lbl}>Data de Matrícula</label>
              <DatePicker value={esEnroll} onChange={setEsEnroll} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Data de Saída</label>
              <DatePicker value={editStudent?.exitDate || ""} onChange={() => {}} readOnly disabled={esSit === "Ativo"} />
            </div>
          </div>
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
          <button onClick={saveEditStudent} className="flex-1 py-2.5 rounded-lg bg-accent-blue text-surface-primary text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer">Salvar Alterações</button>
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
                className="w-full py-2.5 rounded-lg bg-accent-blue text-surface-primary text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer mt-2"
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
          const ds = getDisplayStatus(payPopover.payment, payPopover.month);
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
                    onClick={() => { handleConfirmPayment(payPopover.profId, payPopover.studentId, payPopover.month, Number(payAmount) || payPopover.tuition); setPayPopover(null); }}
                    className="w-full py-2.5 rounded-lg bg-accent-green text-surface-primary text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer"
                  >
                    Confirmar Pagamento
                  </button>
                )}
                {ds !== "WAIVED" && (
                  <button
                    onClick={() => { handleWaivePayment(payPopover.profId, payPopover.studentId, payPopover.month); setPayPopover(null); }}
                    className="w-full py-2.5 rounded-lg bg-surface-tertiary text-text-primary text-xs font-medium hover:bg-surface-tertiary/80 transition-colors border border-border-secondary cursor-pointer"
                  >
                    Isentar Mensalidade
                  </button>
                )}
                {(ds === "PAID" || ds === "WAIVED") && (
                  <button
                    onClick={() => { handleRevertPayment(payPopover.profId, payPopover.studentId, payPopover.month); setPayPopover(null); }}
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
    </div>
  );
};
