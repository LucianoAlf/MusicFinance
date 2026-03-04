import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { MonthSelector } from "../components/MonthSelector";
import { KpiCard } from "../components/KpiCard";
import { Modal, ConfirmModal, useConfirm } from "../components/ui";
import { brl, pct, MS, MF, CCN, CCC, cn } from "../lib/utils";
import {
  DollarSign,
  Wallet,
  PiggyBank,
  Target,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  X,
} from "lucide-react";

const SUGGESTED_CC = [
  { name: "Infraestrutura", color: "#0ea5e9" },
  { name: "Manutenção", color: "#f97316" },
  { name: "Software/SaaS", color: "#ec4899" },
  { name: "Materiais", color: "#84cc16" },
  { name: "Jurídico", color: "#64748b" },
];

export const Financial = () => {
  const { data, curMo, setCurMo, calcMo, dark, viewKpis, handleUpdateRevenue, handleUpdateExpense, handleAddExpenseItem, handleUpdateExpenseItem, handleDeleteExpenseItem, handleAddCostCenter, handleUpdateCostCenter, handleDeleteCostCenter } = useData();
  const [showAddExp, setShowAddExp] = useState<number | null>(null);
  const [neN, setNeN] = useState("");
  const [neT, setNeT] = useState<"F" | "V">("F");

  const [showAddCC, setShowAddCC] = useState(false);
  const [ncName, setNcName] = useState("");
  const [ncColor, setNcColor] = useState("#0ea5e9");

  // Edit cost center
  const [editCC, setEditCC] = useState<string | null>(null);
  const [ecName, setEcName] = useState("");
  const [ecColor, setEcColor] = useState("");

  // Edit expense item
  const [editEI, setEditEI] = useState<{ ccId: string; eiId: string } | null>(null);
  const [eiName, setEiName] = useState("");
  const [eiType, setEiType] = useState<"F" | "V">("F");

  const { state: confirmState, confirm, close: confirmClose } = useConfirm();

  if (!data) return null;

  const calc = calcMo(curMo);
  const cd = cn(
    "rounded-2xl p-5 shadow-sm border",
    dark ? "bg-slate-800/80 border-slate-700/50" : "bg-white border-slate-100"
  );
  const inp = cn(
    "w-20 text-right px-2 py-1.5 rounded-lg text-[11px] border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all",
    dark ? "bg-slate-700 border-slate-600 text-white" : "bg-amber-50 border-amber-200 text-slate-900"
  );

  const updateRev = (k: keyof typeof data.revenue, v: string) => {
    handleUpdateRevenue(k, curMo, Number(v) || 0);
  };

  const updateExp = (ci: number, ii: number, v: string) => {
    const cc = data.expenses[ci];
    const ei = cc.items[ii];
    if (ei.id) handleUpdateExpense(cc.id, ei.id, curMo, Number(v) || 0);
  };

  const confirmAddExp = async () => {
    if (!neN.trim() || showAddExp === null) return;
    const cc = data.expenses[showAddExp];
    await handleAddExpenseItem(cc.id, { name: neN.trim(), type: neT });
    setShowAddExp(null);
    setNeN("");
    setNeT("F");
  };

  const removeExp = (ci: number, ii: number) => {
    confirm({
      title: "Remover Despesa",
      message: "Remover esta linha de despesa?",
      confirmLabel: "Remover",
      variant: "danger",
      onConfirm: async () => {
        const cc = data.expenses[ci];
        const ei = cc.items[ii];
        if (ei.id) await handleDeleteExpenseItem(cc.id, ei.id);
      },
    });
  };

  const confirmAddCC = async () => {
    if (!ncName.trim()) return;
    await handleAddCostCenter({ name: ncName.trim(), color: ncColor });
    setShowAddCC(false);
    setNcName("");
    setNcColor("#0ea5e9");
  };

  const removeCC = (id: string) => {
    confirm({
      title: "Remover Centro de Custo",
      message: "Remover este centro de custo e todas as suas despesas? Esta ação não pode ser desfeita.",
      confirmLabel: "Remover",
      variant: "danger",
      onConfirm: () => handleDeleteCostCenter(id),
    });
  };

  const openEditCC = (cc: { id: string; name: string; color: string }) => {
    setEditCC(cc.id);
    setEcName(cc.name);
    setEcColor(cc.color);
  };

  const saveEditCC = async () => {
    if (!editCC) return;
    const cc = data.expenses.find(c => c.id === editCC);
    if (!cc) return;
    const updates: { name?: string; color?: string } = {};
    if (ecName.trim() && ecName.trim() !== cc.name) updates.name = ecName.trim();
    if (ecColor && ecColor !== cc.color) updates.color = ecColor;
    if (Object.keys(updates).length > 0) await handleUpdateCostCenter(editCC, updates);
    setEditCC(null);
  };

  const openEditEI = (ccId: string, ei: { id?: string; name: string; type: "F" | "V" }) => {
    if (!ei.id) return;
    setEditEI({ ccId, eiId: ei.id });
    setEiName(ei.name);
    setEiType(ei.type);
  };

  const saveEditEI = async () => {
    if (!editEI) return;
    const cc = data.expenses.find(c => c.id === editEI.ccId);
    const ei = cc?.items.find(it => it.id === editEI.eiId);
    if (!ei) return;
    const updates: { name?: string; type?: "F" | "V" } = {};
    if (eiName.trim() && eiName.trim() !== ei.name) updates.name = eiName.trim();
    if (eiType !== ei.type) updates.type = eiType;
    if (Object.keys(updates).length > 0) await handleUpdateExpenseItem(editEI.ccId, editEI.eiId, updates);
    setEditEI(null);
  };

  const lbl = cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500");
  const inpFull = cn("w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50", dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className={cn("text-2xl font-bold", dark ? "text-white" : "text-slate-900")}>Financeiro Mensal</h1>
          <p className={cn("text-xs mt-1", dark ? "text-slate-400" : "text-slate-500")}>
            {MF[curMo]} / {data.config.year}
          </p>
        </div>
        <MonthSelector curMo={curMo} setCurMo={setCurMo} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={DollarSign} label="Receita" value={brl(calc.revenue)} color="green" />
        <KpiCard icon={Wallet} label="Despesas" value={brl(calc.expenses)} color="red" />
        <KpiCard icon={PiggyBank} label="Resultado" value={brl(calc.profit)} color={calc.profit >= 0 ? "green" : "red"} />
        <KpiCard icon={Target} label="Margem" value={pct(calc.margin)} color="purple" />
        <KpiCard icon={GraduationCap} label="Pagantes" value={calc.payingStudents} color="blue" />
      </div>

      {(() => {
        const beMes = viewKpis?.breakeven?.find((b) => b.month === curMo + 1);
        if (!beMes?.breakevenRevenue || !calc) return null;
        const pctBe = Math.min(calc.revenue / beMes.breakevenRevenue, 1.5);
        const above = calc.revenue >= beMes.breakevenRevenue;
        const diff = Math.abs(calc.revenue - beMes.breakevenRevenue);
        return (
          <div className={cn("rounded-2xl p-4 shadow-sm border", dark ? "bg-slate-800/80 border-slate-700/50" : "bg-white border-slate-100")}>
            <div className="flex items-center justify-between mb-2">
              <span className={cn("text-xs font-semibold", dark ? "text-slate-300" : "text-slate-700")}>
                Ponto de Equilíbrio
              </span>
              <span className={cn("text-[11px] font-bold", above ? (dark ? "text-emerald-400" : "text-emerald-600") : (dark ? "text-rose-400" : "text-rose-600"))}>
                {above ? `Acima em ${brl(diff)}` : `Faltam ${brl(diff)}`}
              </span>
            </div>
            <div className={cn("w-full h-3 rounded-full overflow-hidden", dark ? "bg-slate-700" : "bg-slate-200")}>
              <div
                className={cn("h-full rounded-full transition-all duration-500", above ? "bg-emerald-500" : "bg-rose-500")}
                style={{ width: `${Math.max(pctBe * 100, 2)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className={cn("text-[10px]", dark ? "text-slate-500" : "text-slate-400")}>
                Receita: {brl(calc.revenue)}
              </span>
              <span className={cn("text-[10px]", dark ? "text-slate-500" : "text-slate-400")}>
                PE: {brl(beMes.breakevenRevenue)}
              </span>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={cd}>
          <h3 className={cn("text-xs font-semibold mb-3 flex items-center gap-1.5", dark ? "text-emerald-400" : "text-emerald-700")}>
            <TrendingUp size={14} /> Receitas
          </h3>
          <div className="space-y-1.5">
            <div
              className={cn(
                "flex items-center justify-between py-2 px-3 rounded-xl border",
                dark ? "bg-emerald-900/10 border-emerald-800/20" : "bg-emerald-50/50 border-emerald-100"
              )}
            >
              <span className={cn("text-[11px] font-medium", dark ? "text-slate-300" : "text-slate-700")}>
                Mensalidades (auto)
              </span>
              <span className={cn("text-[11px] font-bold", dark ? "text-emerald-400" : "text-emerald-600")}>
                {brl(calc.tuition)}
              </span>
            </div>
            {[
              { k: "enrollments" as const, l: "Matrículas" },
              { k: "shop" as const, l: "Lojinha" },
              { k: "events" as const, l: "Eventos" },
              { k: "interest" as const, l: "Juros/Multas" },
              { k: "other" as const, l: "Outras" },
            ].map((r) => (
              <div
                key={r.k}
                className={cn(
                  "flex items-center justify-between py-1.5 px-3 rounded-xl",
                  dark ? "bg-slate-700/30" : "bg-slate-50"
                )}
              >
                <span className={cn("text-[11px]", dark ? "text-slate-300" : "text-slate-700")}>{r.l}</span>
                <input
                  type="number"
                  value={data.revenue?.[r.k]?.[curMo] || 0}
                  onChange={(e) => updateRev(r.k, e.target.value)}
                  className={inp}
                />
              </div>
            ))}
            <div
              className={cn(
                "flex items-center justify-between py-2.5 px-3 rounded-xl font-semibold border",
                dark ? "bg-emerald-900/30 text-emerald-400 border-transparent" : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}
            >
              <span className="text-[11px]">TOTAL</span>
              <span className="text-sm">{brl(calc.revenue)}</span>
            </div>
          </div>
        </div>

        <div className={cd}>
          <h3 className={cn("text-xs font-semibold mb-3 flex items-center gap-1.5", dark ? "text-rose-400" : "text-rose-700")}>
            <TrendingDown size={14} /> Despesas
          </h3>
          <div className="space-y-1.5">
            <div
              className={cn(
                "flex items-center justify-between py-2 px-3 rounded-xl border",
                dark ? "bg-violet-900/10 border-violet-800/20" : "bg-violet-50/50 border-violet-100"
              )}
            >
              <span className={cn("text-[11px] font-medium", dark ? "text-slate-300" : "text-slate-700")}>
                Folha Prof. (auto)
              </span>
              <span className={cn("text-[11px] font-bold", dark ? "text-violet-400" : "text-violet-600")}>
                {brl(calc.profPayroll)}
              </span>
            </div>
            {(data.expenses || []).map((cc) => {
              const t = cc.items.reduce((s, it) => s + (it.amounts?.[curMo] || 0), 0);
              return (
                <div
                  key={cc.id}
                  className={cn(
                    "flex items-center justify-between py-1.5 px-3 rounded-xl",
                    dark ? "bg-slate-700/30" : "bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cc.color }}></div>
                    <span className={cn("text-[11px]", dark ? "text-slate-300" : "text-slate-700")}>{cc.name}</span>
                  </div>
                  <span className={cn("text-[11px] font-medium", dark ? "text-slate-300" : "text-slate-600")}>{brl(t)}</span>
                </div>
              );
            })}
            <div
              className={cn(
                "flex items-center justify-between py-2.5 px-3 rounded-xl font-semibold border",
                dark ? "bg-rose-900/30 text-rose-400 border-transparent" : "bg-rose-50 text-rose-700 border-rose-200"
              )}
            >
              <span className="text-[11px]">TOTAL</span>
              <span className="text-sm">{brl(calc.expenses)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={cd}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn("text-xs font-semibold", dark ? "text-slate-300" : "text-slate-700")}>
            Detalhamento por Centro de Custo
          </h3>
          <button
            onClick={() => setShowAddCC(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-600 text-[10px] font-semibold hover:bg-violet-500/20 transition-all border border-violet-500/20 cursor-pointer"
          >
            <Plus size={12} /> Novo Centro de Custo
          </button>
        </div>
        <div className="space-y-3">
          {(data.expenses || []).map((cc, ci) => (
            <div key={cc.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: cc.color }}></div>
                <button
                  onClick={() => openEditCC(cc)}
                  className={cn("text-[11px] font-bold border-none bg-transparent cursor-pointer p-0 transition-colors", dark ? "text-slate-300 hover:text-violet-400" : "text-slate-700 hover:text-violet-600")}
                >{cc.name}</button>
                <button
                  onClick={() => setShowAddExp(ci)}
                  className={cn(
                    "ml-auto flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg transition-all border-none cursor-pointer",
                    dark ? "bg-slate-700 text-slate-400 hover:bg-slate-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  <Plus size={10} /> Linha
                </button>
                <button
                  onClick={() => removeCC(cc.id)}
                  className={cn(
                    "flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg transition-all border-none cursor-pointer text-rose-500 hover:bg-rose-500/10",
                    dark ? "bg-slate-700" : "bg-slate-100"
                  )}
                >
                  <Trash2 size={10} />
                </button>
              </div>
              <div className="space-y-0.5 ml-5">
                {cc.items.map((it, ii) => (
                  <div
                    key={it.id || ii}
                    className={cn(
                      "flex items-center gap-2 py-1.5 px-3 rounded-lg transition-all",
                      dark ? "bg-slate-700/20 hover:bg-slate-700/40" : "bg-slate-50/70 hover:bg-slate-100"
                    )}
                  >
                    <button
                      onClick={() => openEditEI(cc.id, it)}
                      className={cn("flex-1 text-left text-[11px] border-none bg-transparent cursor-pointer p-0 transition-colors", dark ? "text-slate-300 hover:text-violet-400" : "text-slate-700 hover:text-violet-600")}
                    >{it.name}</button>
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-semibold",
                        it.type === "F"
                          ? dark
                            ? "bg-blue-900/30 text-blue-400"
                            : "bg-blue-50 text-blue-600"
                          : dark
                          ? "bg-amber-900/30 text-amber-400"
                          : "bg-amber-50 text-amber-600"
                      )}
                    >
                      {it.type === "F" ? "Fixo" : "Var"}
                    </span>
                    <input
                      type="number"
                      value={it.amounts?.[curMo] || 0}
                      onChange={(e) => updateExp(ci, ii, e.target.value)}
                      className={inp}
                      style={{ width: "80px" }}
                    />
                    <button
                      onClick={() => removeExp(ci, ii)}
                      className="p-1 rounded-md text-rose-400 hover:text-rose-600 transition-all border-none bg-transparent cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Nova Despesa */}
      <Modal
        open={showAddExp !== null}
        onOpenChange={(v) => { if (!v) setShowAddExp(null); }}
        title="Nova Despesa"
        dark={dark}
        size="sm"
      >
        <div className="space-y-3">
          <div>
            <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
              Nome
            </label>
            <input
              value={neN}
              onChange={(e) => setNeN(e.target.value)}
              className={cn(
                "w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200"
              )}
              placeholder="Ex: Limpeza"
              autoFocus
            />
          </div>
          <div>
            <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
              Tipo
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setNeT("F")}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 cursor-pointer",
                  neT === "F"
                    ? dark ? "bg-blue-900/30 text-blue-400 border-blue-500" : "bg-blue-50 text-blue-600 border-blue-300"
                    : dark ? "bg-slate-700 text-slate-400 border-slate-600 opacity-40" : "bg-slate-100 text-slate-500 border-slate-200 opacity-40"
                )}
              >Fixo</button>
              <button
                onClick={() => setNeT("V")}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 cursor-pointer",
                  neT === "V"
                    ? dark ? "bg-amber-900/30 text-amber-400 border-amber-500" : "bg-amber-50 text-amber-600 border-amber-300"
                    : dark ? "bg-slate-700 text-slate-400 border-slate-600 opacity-40" : "bg-slate-100 text-slate-500 border-slate-200 opacity-40"
                )}
              >Var</button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={confirmAddExp}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-semibold shadow-lg border-none cursor-pointer"
          >
            Adicionar
          </button>
          <button
            onClick={() => setShowAddExp(null)}
            className={cn("px-4 py-2.5 rounded-xl text-xs border-none cursor-pointer", dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600")}
          >
            Cancelar
          </button>
        </div>
      </Modal>

      {/* Modal Novo Centro de Custo */}
      <Modal
        open={showAddCC}
        onOpenChange={(v) => { if (!v) setShowAddCC(false); }}
        title="Novo Centro de Custo"
        dark={dark}
        size="sm"
      >
        <div className="space-y-3">
          <div>
            <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
              Sugestões
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SUGGESTED_CC.map((sug) => (
                <button
                  key={sug.name}
                  onClick={() => { setNcName(sug.name); setNcColor(sug.color); }}
                  className={cn(
                    "px-2 py-1 text-[10px] rounded-md border transition-all cursor-pointer",
                    ncName === sug.name
                      ? "bg-violet-500/20 border-violet-500/50 text-violet-600"
                      : dark ? "bg-slate-700 border-slate-600 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                  )}
                >
                  {sug.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
              Nome do Centro de Custo
            </label>
            <input
              value={ncName}
              onChange={(e) => setNcName(e.target.value)}
              className={cn(
                "w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200"
              )}
              placeholder="Ex: Manutenção"
              autoFocus
            />
          </div>
          <div>
            <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
              Cor
            </label>
            <input
              type="color"
              value={ncColor}
              onChange={(e) => setNcColor(e.target.value)}
              className="w-full h-10 rounded-xl cursor-pointer border-0 p-0"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={confirmAddCC}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-semibold shadow-lg border-none cursor-pointer"
          >
            Criar
          </button>
          <button
            onClick={() => setShowAddCC(false)}
            className={cn("px-4 py-2.5 rounded-xl text-xs border-none cursor-pointer", dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600")}
          >
            Cancelar
          </button>
        </div>
      </Modal>

      {/* Modal Editar Centro de Custo */}
      <Modal
        open={!!editCC}
        onOpenChange={(v) => { if (!v) setEditCC(null); }}
        title="Editar Centro de Custo"
        dark={dark}
        size="sm"
      >
        <div className="space-y-3">
          <div>
            <label className={lbl}>Nome</label>
            <input value={ecName} onChange={(e) => setEcName(e.target.value)} className={inpFull} autoFocus />
          </div>
          <div>
            <label className={lbl}>Cor</label>
            <input type="color" value={ecColor} onChange={(e) => setEcColor(e.target.value)} className="w-full h-10 rounded-xl cursor-pointer border-0 p-0" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={saveEditCC} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-semibold shadow-lg border-none cursor-pointer">
            Salvar
          </button>
          <button onClick={() => setEditCC(null)} className={cn("px-4 py-2.5 rounded-xl text-xs border-none cursor-pointer", dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600")}>
            Cancelar
          </button>
        </div>
      </Modal>

      {/* Modal Editar Item de Despesa */}
      <Modal
        open={!!editEI}
        onOpenChange={(v) => { if (!v) setEditEI(null); }}
        title="Editar Item de Despesa"
        dark={dark}
        size="sm"
      >
        <div className="space-y-3">
          <div>
            <label className={lbl}>Nome</label>
            <input value={eiName} onChange={(e) => setEiName(e.target.value)} className={inpFull} autoFocus />
          </div>
          <div>
            <label className={lbl}>Tipo</label>
            <div className="flex gap-2">
              <button
                onClick={() => setEiType("F")}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 cursor-pointer",
                  eiType === "F"
                    ? dark ? "bg-blue-900/30 text-blue-400 border-blue-500" : "bg-blue-50 text-blue-600 border-blue-300"
                    : dark ? "bg-slate-700 text-slate-400 border-slate-600 opacity-40" : "bg-slate-100 text-slate-500 border-slate-200 opacity-40"
                )}
              >Fixo</button>
              <button
                onClick={() => setEiType("V")}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 cursor-pointer",
                  eiType === "V"
                    ? dark ? "bg-amber-900/30 text-amber-400 border-amber-500" : "bg-amber-50 text-amber-600 border-amber-300"
                    : dark ? "bg-slate-700 text-slate-400 border-slate-600 opacity-40" : "bg-slate-100 text-slate-500 border-slate-200 opacity-40"
                )}
              >Variável</button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={saveEditEI} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-semibold shadow-lg border-none cursor-pointer">
            Salvar
          </button>
          <button onClick={() => setEditEI(null)} className={cn("px-4 py-2.5 rounded-xl text-xs border-none cursor-pointer", dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600")}>
            Cancelar
          </button>
        </div>
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
