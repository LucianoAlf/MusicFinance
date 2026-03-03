import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { MonthSelector } from "../components/MonthSelector";
import { KpiCard } from "../components/KpiCard";
import { brl, pct, MS, MF, cn } from "../lib/utils";
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

export const Professors = () => {
  const { data, curMo, setCurMo, selProf, setSelProf, selPay, setSelPay, dark, viewKpis, handleAddProfessor, handleDeleteProfessor, handleAddStudent, handleDeleteStudent, handleUpdatePayment } = useData();
  const [showAddProf, setShowAddProf] = useState(false);
  const [showAddStud, setShowAddStud] = useState<string | null>(null);
  const [npName, setNpName] = useState("");
  const [npInst, setNpInst] = useState("");
  const [npCost, setNpCost] = useState("100");
  const [nsName, setNsName] = useState("");
  const [nsHour, setNsHour] = useState("14:00");
  const [nsDay, setNsDay] = useState("Seg");
  const [nsVal, setNsVal] = useState(data?.config.tuition.toString() || "358");

  if (!data) return null;

  const cd = cn(
    "rounded-2xl p-4 shadow-sm border",
    dark ? "bg-slate-800/80 border-slate-700/50" : "bg-white border-slate-100"
  );

  let _tP = data.professors.length,
    _tA = 0,
    _tPg = 0,
    _tR = 0,
    _tF = 0;
  data.professors.forEach((p) => {
    _tA += p.students.length;
    let py = 0;
    p.students.forEach((s) => {
      const v = s.payments && s.payments[curMo];
      if (v && v > 0) {
        _tR += v;
        py++;
        _tPg++;
      }
    });
    _tF += py * p.costPerStudent;
  });
  const _pF = _tR > 0 ? _tF / _tR : 0;
  const _tk = _tPg > 0 ? _tR / _tPg : 0;
  const _ma = _tP > 0 ? _tA / _tP : 0;

  const kpiMes = viewKpis?.monthly?.find((k) => k.month === curMo + 1);
  const avgTenure = viewKpis?.avgTenureMonths ?? 0;
  const newEnrollments = kpiMes?.newEnrollments ?? 0;
  const churnedStudents = kpiMes?.churnedStudents ?? 0;

  const prof = selProf ? data.professors.find((p) => p.id === selProf) : null;

  const confirmAddProf = async () => {
    if (!npName.trim()) return;
    await handleAddProfessor({
      name: npName.trim(),
      instrument: npInst.trim() || "Instrumento",
      costPerStudent: Number(npCost) || 100,
    });
    setShowAddProf(false);
    setNpName("");
    setNpInst("");
    setNpCost("100");
  };

  const confirmAddStudent = async (pid: string) => {
    if (!nsName.trim()) return;
    await handleAddStudent(pid, {
      name: nsName.trim(),
      day: nsDay,
      time: nsHour,
      tuition: Number(nsVal) || data.config.tuition,
    });
    setShowAddStud(null);
    setNsName("");
  };

  const removeProf = async (pid: string) => {
    if (confirm("Remover?")) {
      await handleDeleteProfessor(pid);
    }
  };

  const removeStudent = async (pid: string, sid: string) => {
    if (confirm("Remover?")) {
      await handleDeleteStudent(pid, sid);
    }
  };

  const updatePay = (pid: string, sid: string, m: number, v: string) => {
    handleUpdatePayment(pid, sid, m, v);
  };

  return (
    <div className="space-y-5">
      {/* Header com seletor de meses */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className={cn("text-2xl font-bold", dark ? "text-white" : "text-slate-900")}>Professores</h1>
          <p className={cn("text-xs mt-1", dark ? "text-slate-400" : "text-slate-500")}>
            {data.professors.length} profs · {data.professors.reduce((s, p) => s + p.students.length, 0)} alunos · {MF[curMo]}
          </p>
        </div>
        <MonthSelector curMo={curMo} setCurMo={setCurMo} />
      </div>

      {/* KPIs principais */}
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

      {/* KPIs extras Fase 3 */}
      <div className="grid grid-cols-3 gap-2">
        <KpiCard icon={Clock} label="Permanência" value={avgTenure.toFixed(1) + " meses"} color="cyan" />
        <KpiCard icon={UserPlus} label={`Matrículas ${MS[curMo]}`} value={newEnrollments} color="teal" />
        <KpiCard icon={UserMinus} label={`Evasões ${MS[curMo]}`} value={churnedStudents} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de professores com trends */}
        <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
          {data.professors.map((p) => {
            const pay = p.students.filter((s) => s.payments && s.payments[curMo] && s.payments[curMo]! > 0).length;
            const rev = p.students.reduce((sum, s) => sum + ((s.payments && s.payments[curMo]) || 0), 0);
            const pp = rev > 0 ? (pay * p.costPerStudent) / rev : 0;
            const ticketProf = pay > 0 ? rev / pay : 0;

            // Calcular receita do mês anterior para trend
            const prevRev = curMo > 0
              ? p.students.reduce((sum, s) => sum + ((s.payments && s.payments[curMo - 1]) || 0), 0)
              : null;
            const trendProf = prevRev != null && prevRev > 0
              ? ((rev - prevRev) / prevRev) * 100
              : null;
            const trendUp = trendProf != null && trendProf >= 0;

            return (
              <div
                key={p.id}
                onClick={() => {
                  setSelProf(p.id);
                  setSelPay(null);
                }}
                className={cn(
                  "rounded-xl p-3 cursor-pointer transition-all border",
                  selProf === p.id
                    ? dark
                      ? "bg-violet-500/15 border-violet-500/30"
                      : "bg-violet-50 border-violet-200 ring-1 ring-violet-100"
                    : dark
                    ? "bg-slate-800/60 border-slate-700/50 hover:bg-slate-800"
                    : "bg-white border-slate-100 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        selProf === p.id
                          ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                          : dark
                          ? "bg-slate-700 text-slate-500"
                          : "bg-slate-100 text-slate-400"
                      )}
                    >
                      <Music size={14} />
                    </div>
                    <div>
                      <p className={cn("text-xs font-semibold", dark ? "text-white" : "text-slate-900")}>{p.name}</p>
                      <p className={cn("text-[10px]", dark ? "text-slate-400" : "text-slate-500")}>
                        {p.instrument} · {p.students.length} al. · {pay} pag.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <p className={cn("text-xs font-bold", dark ? "text-emerald-400" : "text-emerald-600")}>{brl(rev)}</p>
                      {trendProf != null && (
                        <span className={cn(
                          "text-[9px] flex items-center",
                          trendUp
                            ? (dark ? "text-emerald-400" : "text-emerald-600")
                            : (dark ? "text-rose-400" : "text-rose-600")
                        )}>
                          {trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {Math.abs(trendProf).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-[10px]",
                        pp > 0.45 ? "text-rose-500 font-semibold" : dark ? "text-slate-400" : "text-slate-500"
                      )}
                    >
                      {pct(pp)} folha
                    </p>
                    <p className={cn("text-[9px]", dark ? "text-teal-400" : "text-teal-600")}>
                      Ticket: {brl(ticketProf)}
                    </p>
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
                    <p className={cn("font-bold text-sm", dark ? "text-white" : "text-slate-900")}>{prof.name}</p>
                    <p className={cn("text-[11px]", dark ? "text-slate-400" : "text-slate-500")}>
                      {prof.instrument} · R$ {prof.costPerStudent}/aluno · {prof.students.length} alunos ·{" "}
                      {prof.students.filter((s) => s.payments && s.payments[curMo] && s.payments[curMo]! > 0).length}{" "}
                      pagantes
                    </p>
                    <p className={cn("text-[10px] font-semibold", dark ? "text-emerald-400" : "text-emerald-600")}>
                      Receita {MS[curMo]}:{" "}
                      {brl(prof.students.reduce((sum, s) => sum + ((s.payments && s.payments[curMo]) || 0), 0))}
                      <span className={cn("ml-2", dark ? "text-teal-400" : "text-teal-600")}>
                        Ticket:{" "}
                        {brl(
                          (() => {
                            const payProf = prof.students.filter((s) => s.payments && s.payments[curMo] && s.payments[curMo]! > 0).length;
                            const revProf = prof.students.reduce((sum, s) => sum + ((s.payments && s.payments[curMo]) || 0), 0);
                            return payProf > 0 ? revProf / payProf : 0;
                          })()
                        )}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddStud(prof.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold hover:bg-emerald-500/20 transition-all border border-emerald-500/20 cursor-pointer"
                  >
                    <UserPlus size={14} /> Novo Aluno
                  </button>
                  <button
                    onClick={() => removeProf(prof.id)}
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all border border-rose-500/20 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[58vh]">
                <table className="w-full text-[11px]">
                  <thead className={cn("sticky top-0 z-10", dark ? "bg-slate-800" : "bg-white")}>
                    <tr className={cn("border-b", dark ? "text-slate-400 border-slate-700" : "text-slate-500 border-slate-200")}>
                      <th className="text-left py-2.5 px-2 font-semibold">Nome</th>
                      <th className="text-center py-2.5 px-1 w-12 font-semibold">Hora</th>
                      <th className="text-center py-2.5 px-1 w-10 font-semibold">Dia</th>
                      <th className="text-center py-2.5 px-1 w-16 font-semibold">Situação</th>
                      <th className="w-10 text-center py-2.5 font-semibold">Pgto</th>
                      <th className="w-8 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {prof.students.map((s) => {
                      return (
                        <React.Fragment key={s.id}>
                          <tr
                            className={cn(
                              "border-t transition-colors",
                              dark ? "border-slate-700/30 hover:bg-slate-700/20" : "border-slate-100 hover:bg-slate-50"
                            )}
                          >
                            <td className={cn("py-2 px-2 font-medium", dark ? "text-white" : "text-slate-800")}>{s.name}</td>
                            <td className={cn("py-2 px-1 text-center", dark ? "text-slate-400" : "text-slate-500")}>
                              {s.hour || "—"}
                            </td>
                            <td className={cn("py-2 px-1 text-center", dark ? "text-slate-400" : "text-slate-500")}>
                              {s.day || "—"}
                            </td>
                            <td className="py-2 px-1 text-center">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                  s.situation === "Ativo"
                                    ? dark
                                      ? "bg-emerald-900/30 text-emerald-400"
                                      : "bg-emerald-50 text-emerald-600"
                                    : dark
                                    ? "bg-amber-900/30 text-amber-400"
                                    : "bg-amber-50 text-amber-600"
                                )}
                              >
                                {s.situation}
                              </span>
                            </td>
                            <td className="py-2 text-center">
                              <button
                                onClick={() => setSelPay(selPay === s.id ? null : s.id)}
                                className={cn(
                                  "px-2 py-1 rounded-lg text-[10px] font-medium transition-all border-none cursor-pointer",
                                  selPay === s.id
                                    ? dark
                                      ? "bg-violet-500/20 text-violet-400"
                                      : "bg-violet-100 text-violet-700"
                                    : dark
                                    ? "bg-slate-700 text-slate-400"
                                    : "bg-slate-100 text-slate-500"
                                )}
                              >
                                {selPay === s.id ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                              </button>
                            </td>
                            <td className="py-2 text-center">
                              <button
                                onClick={() => removeStudent(prof.id, s.id)}
                                className="p-1 rounded-lg text-rose-400 hover:text-rose-600 transition-all border-none bg-transparent cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            </td>
                          </tr>
                          {selPay === s.id && (
                            <tr>
                              <td colSpan={6}>
                                <div
                                  className={cn(
                                    "p-3 my-1 rounded-xl border",
                                    dark
                                      ? "bg-slate-700/40 border-slate-600/30"
                                      : "bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-100"
                                  )}
                                >
                                  <p
                                    className={cn(
                                      "text-[10px] font-semibold mb-2 flex items-center gap-1.5",
                                      dark ? "text-violet-400" : "text-violet-700"
                                    )}
                                  >
                                    <Calendar size={12} /> Pagamentos {data.config.year}
                                  </p>
                                  <div className="grid grid-cols-12 gap-1.5">
                                    {MS.map((m, mi) => {
                                      const v = s.payments[mi];
                                      const ok = v != null && v > 0;
                                      const miss = v === 0;
                                      return (
                                        <div key={m} className="text-center">
                                          <label
                                            className={cn(
                                              "text-[9px] font-semibold",
                                              dark ? "text-slate-400" : "text-slate-500",
                                              mi === curMo && (dark ? "text-violet-400" : "text-violet-600")
                                            )}
                                          >
                                            {m}
                                          </label>
                                          <input
                                            type="number"
                                            value={v != null ? v : ""}
                                            onChange={(e) => updatePay(prof.id, s.id, mi, e.target.value)}
                                            className={cn(
                                              "w-full text-center text-[10px] px-0.5 py-1.5 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all",
                                              ok
                                                ? dark
                                                  ? "bg-emerald-900/20 border-emerald-600/40 text-emerald-400"
                                                  : "bg-emerald-50 border-emerald-300 text-emerald-700"
                                                : miss
                                                ? dark
                                                  ? "bg-rose-900/20 border-rose-600/40 text-rose-400"
                                                  : "bg-rose-50 border-rose-300 text-rose-600"
                                                : dark
                                                ? "bg-slate-600 border-slate-500 text-white"
                                                : "bg-white border-slate-200 text-slate-800",
                                              mi === curMo && (dark ? "ring-1 ring-violet-500/50" : "ring-1 ring-violet-400")
                                            )}
                                            placeholder="—"
                                          />
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
              <div
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center",
                  dark ? "bg-slate-700 text-slate-500" : "bg-slate-100 text-slate-300"
                )}
              >
                <Users size={28} />
              </div>
              <p className={cn("text-sm", dark ? "text-slate-500" : "text-slate-400")}>Selecione um professor à esquerda</p>
            </div>
          )}
        </div>
      </div>

      {showAddProf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={cn("w-96 rounded-2xl p-6 shadow-2xl", dark ? "bg-slate-800" : "bg-white")}>
            <h3 className={cn("text-sm font-bold mb-4 flex items-center gap-2", dark ? "text-white" : "text-slate-900")}>
              <UserPlus size={18} /> Novo Professor
            </h3>
            <div className="space-y-3">
              <div>
                <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
                  Nome
                </label>
                <input
                  value={npName}
                  onChange={(e) => setNpName(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                    dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200"
                  )}
                  placeholder="Ex: João Silva"
                  autoFocus
                />
              </div>
              <div>
                <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
                  Instrumento
                </label>
                <input
                  value={npInst}
                  onChange={(e) => setNpInst(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                    dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200"
                  )}
                  placeholder="Ex: Guitarra"
                />
              </div>
              <div>
                <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
                  Custo por Aluno (R$)
                </label>
                <input
                  type="number"
                  value={npCost}
                  onChange={(e) => setNpCost(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                    dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200"
                  )}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={confirmAddProf}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-semibold shadow-lg border-none cursor-pointer"
              >
                Cadastrar
              </button>
              <button
                onClick={() => setShowAddProf(false)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-medium border-none cursor-pointer",
                  dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
                )}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddStud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={cn("w-96 rounded-2xl p-6 shadow-2xl", dark ? "bg-slate-800" : "bg-white")}>
            <h3 className={cn("text-sm font-bold mb-4 flex items-center gap-2", dark ? "text-white" : "text-slate-900")}>
              <UserPlus size={18} /> Novo Aluno
            </h3>
            <div className="space-y-3">
              <div>
                <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
                  Nome
                </label>
                <input
                  value={nsName}
                  onChange={(e) => setNsName(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                    dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200"
                  )}
                  placeholder="Ex: Ana Clara"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
                    Horário
                  </label>
                  <input
                    value={nsHour}
                    onChange={(e) => setNsHour(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                      dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200"
                    )}
                  />
                </div>
                <div>
                  <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
                    Dia
                  </label>
                  <select
                    value={nsDay}
                    onChange={(e) => setNsDay(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none",
                      dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <option>Seg</option>
                    <option>Ter</option>
                    <option>Qua</option>
                    <option>Qui</option>
                    <option>Sex</option>
                    <option>Sab</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
                  Mensalidade (R$)
                </label>
                <input
                  type="number"
                  value={nsVal}
                  onChange={(e) => setNsVal(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                    dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200"
                  )}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => confirmAddStudent(showAddStud)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold shadow-lg border-none cursor-pointer"
              >
                Cadastrar Aluno
              </button>
              <button
                onClick={() => setShowAddStud(null)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-medium border-none cursor-pointer",
                  dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
                )}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
