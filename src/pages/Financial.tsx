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
  const {
    data, curMo, setCurMo, calcMo, viewKpis,
    handleUpdateRevenue, handleAddRevenueCategory, handleUpdateRevenueCategory, handleDeleteRevenueCategory,
    handleUpdateExpense, handleAddExpenseItem, handleUpdateExpenseItem, handleDeleteExpenseItem,
    handleAddCostCenter, handleUpdateCostCenter, handleDeleteCostCenter
  } = useData();

  // Revenue Categories
  const [showAddRev, setShowAddRev] = useState(false);
  const [nrName, setNrName] = useState("");
  const [editRev, setEditRev] = useState<{ id: string; name: string } | null>(null);

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
    "rounded-xl p-4 shadow-sm border",
    "bg-surface-secondary border-border-primary"
  );
  const inp = cn(
    "w-20 text-right px-2 py-1.5 rounded-lg text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-border-hover transition-all bg-surface-tertiary border-border-secondary text-text-primary"
  );

  // Revenue Category handlers
  const updateRev = (categoryId: string, v: string) => {
    handleUpdateRevenue(categoryId, curMo, Number(v) || 0);
  };

  const confirmAddRev = () => {
    if (!nrName.trim()) return;
    const name = nrName.trim();
    setShowAddRev(false);
    setNrName("");
    handleAddRevenueCategory(name);
  };

  const removeRev = (id: string) => {
    confirm({
      title: "Remover Receita",
      message: "Remover esta categoria de receita e todos os seus lançamentos? Esta ação não pode ser desfeita.",
      confirmLabel: "Remover",
      variant: "danger",
      onConfirm: () => handleDeleteRevenueCategory(id),
    });
  };

  const openEditRev = (rc: { id: string; name: string }) => {
    setEditRev({ id: rc.id, name: rc.name });
  };

  const saveEditRev = () => {
    if (!editRev || !editRev.name.trim()) return;
    const { id, name } = editRev;
    setEditRev(null);
    handleUpdateRevenueCategory(id, name.trim());
  };

  const updateExp = (ci: number, ii: number, v: string) => {
    const cc = data.expenses[ci];
    const ei = cc.items[ii];
    if (ei.id) handleUpdateExpense(cc.id, ei.id, curMo, Number(v) || 0);
  };

  const confirmAddExp = () => {
    if (!neN.trim() || showAddExp === null) return;
    const cc = data.expenses[showAddExp];
    const name = neN.trim();
    const type = neT;
    setShowAddExp(null);
    setNeN("");
    setNeT("F");
    handleAddExpenseItem(cc.id, { name, type });
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

  const confirmAddCC = () => {
    if (!ncName.trim()) return;
    const name = ncName.trim();
    const color = ncColor;
    setShowAddCC(false);
    setNcName("");
    setNcColor("#0ea5e9");
    handleAddCostCenter({ name, color });
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

  const saveEditCC = () => {
    if (!editCC) return;
    const cc = data.expenses.find(c => c.id === editCC);
    if (!cc) return;
    const updates: { name?: string; color?: string } = {};
    if (ecName.trim() && ecName.trim() !== cc.name) updates.name = ecName.trim();
    if (ecColor && ecColor !== cc.color) updates.color = ecColor;
    const id = editCC;
    setEditCC(null);
    if (Object.keys(updates).length > 0) handleUpdateCostCenter(id, updates);
  };

  const openEditEI = (ccId: string, ei: { id?: string; name: string; type: "F" | "V" }) => {
    if (!ei.id) return;
    setEditEI({ ccId, eiId: ei.id });
    setEiName(ei.name);
    setEiType(ei.type);
  };

  const saveEditEI = () => {
    if (!editEI) return;
    const cc = data.expenses.find(c => c.id === editEI.ccId);
    const ei = cc?.items.find(it => it.id === editEI.eiId);
    if (!ei) return;
    const updates: { name?: string; type?: "F" | "V" } = {};
    if (eiName.trim() && eiName.trim() !== ei.name) updates.name = eiName.trim();
    if (eiType !== ei.type) updates.type = eiType;
    const { ccId, eiId } = editEI;
    setEditEI(null);
    if (Object.keys(updates).length > 0) handleUpdateExpenseItem(ccId, eiId, updates);
  };

  const lbl = "text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider";
  const inpFull = "w-full px-3 py-2.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-border-hover bg-surface-tertiary border-border-secondary text-text-primary";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border-primary pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Financeiro</h1>
          <p className="text-xs mt-1 text-text-secondary">
            {MF[curMo]} · {data.config.year}
          </p>
        </div>
        <MonthSelector curMo={curMo} setCurMo={setCurMo} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <KpiCard label="Previsto" value={brl(calc.expectedRevenue)} sub={calc.expectedRevenue > 0 ? `Realizado: ${pct(calc.revenue / calc.expectedRevenue)}` : undefined} />
        <KpiCard label="Receita" value={brl(calc.revenue)} />
        <KpiCard label="Despesas" value={brl(calc.expenses)} />
        <KpiCard label="Resultado" value={brl(calc.profit)} />
        <KpiCard label="Margem" value={pct(calc.margin)} />
        <KpiCard label="Pagantes" value={calc.payingStudents} />
        <KpiCard label="Custo/Aluno" value={brl(calc.costPerStudent)} sub={`${calc.activeStudents || 0} alunos ativos`} />
      </div>

      {(() => {
        // PE (Alunos) = Despesas Fixas / (Ticket Médio - Custo Var por Aluno)
        const marginPerStudent = calc.ticket - calc.costPerStudent;
        const beAlunos = marginPerStudent > 0 ? Math.ceil(calc.fixedCost / marginPerStudent) : null;
        if (beAlunos === null || !calc) return null;

        const pctBe = Math.min(calc.payingStudents / beAlunos, 1.5);
        const above = calc.payingStudents >= beAlunos;
        const diff = Math.abs(calc.payingStudents - beAlunos);

        return (
          <div className="rounded-xl p-4 shadow-sm border bg-surface-tertiary border-border-primary">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                Ponto de Equilíbrio (Alunos)
              </span>
              <span className={cn("text-[11px] font-mono font-medium", above ? "text-accent-green" : "text-accent-red")}>
                {above ? `Meta atingida (+${diff})` : `Faltam ${diff} alunos`}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-secondary overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", above ? "bg-accent-green" : "bg-accent-red")}
                style={{ width: `${Math.max(pctBe * 100, 2)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] font-mono text-text-secondary">
                Pagantes: {calc.payingStudents}
              </span>
              <span className="text-[10px] font-mono text-text-secondary">
                Meta PE: {beAlunos} alunos
              </span>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={cd}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Receitas
            </h3>
            <button
              onClick={() => setShowAddRev(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer"
            >
              <Plus size={14} /> Nova Receita
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg border bg-surface-tertiary border-border-secondary">
              <span className="text-[11px] font-medium text-text-secondary">
                Parcelas/Mensalidades (auto)
              </span>
              <span className="text-[11px] font-mono font-medium text-accent-green">
                {brl(calc.tuition)}
              </span>
            </div>
            {(data.revenue || []).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-surface-tertiary/50 transition-colors">
                <button
                  onClick={() => openEditRev(r)}
                  className="text-[11px] border-none bg-transparent cursor-pointer p-0 transition-colors text-text-secondary hover:text-accent-blue text-left"
                >
                  {r.name}
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={r.amounts?.[curMo] || ""}
                    onChange={(e) => updateRev(r.id, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className={inp}
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg font-semibold border-t border-border-primary mt-2">
              <span className="text-[11px] uppercase tracking-wider text-text-secondary">TOTAL</span>
              <span className="text-sm font-mono text-accent-green">{brl(calc.revenue)}</span>
            </div>
          </div>
        </div>

        <div className={cd}>
          <h3 className="text-xs font-semibold mb-4 text-text-primary uppercase tracking-wider">
            Despesas
          </h3>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg border bg-surface-tertiary border-border-secondary">
              <span className="text-[11px] font-medium text-text-secondary">
                Folha Prof. (auto)
              </span>
              <span className="text-[11px] font-mono font-medium text-accent-red">
                {brl(calc.profPayroll)}
              </span>
            </div>
            {(data.expenses || []).map((cc) => {
              const t = cc.items.reduce((s, it) => s + (it.amounts?.[curMo] || 0), 0);
              return (
                <div key={cc.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-surface-tertiary/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full opacity-80" style={{ backgroundColor: cc.color }}></div>
                    <span className="text-[11px] text-text-secondary">{cc.name}</span>
                  </div>
                  <span className="text-[11px] font-mono font-medium text-text-primary">{brl(t)}</span>
                </div>
              );
            })}
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg font-semibold border-t border-border-primary mt-2">
              <span className="text-[11px] uppercase tracking-wider text-text-secondary">TOTAL</span>
              <span className="text-sm font-mono text-accent-red">{brl(calc.expenses)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={cd}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Detalhamento por Centro de Custo
          </h3>
          <button
            onClick={() => setShowAddCC(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer"
          >
            <Plus size={14} /> Novo Centro de Custo
          </button>
        </div>
        <div className="space-y-3">
          {(data.expenses || []).map((cc, ci) => (
            <div key={cc.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cc.color }}></div>
                <button
                  onClick={() => openEditCC(cc)}
                  className="text-[11px] font-bold border-none bg-transparent cursor-pointer p-0 transition-colors text-text-primary hover:text-accent-blue uppercase tracking-wider"
                >{cc.name}</button>
                <button
                  onClick={() => setShowAddExp(ci)}
                  className="ml-auto flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg transition-all border-none cursor-pointer bg-surface-tertiary text-text-secondary hover:text-text-primary hover:bg-surface-tertiary/80"
                >
                  <Plus size={10} /> Linha
                </button>
                <button
                  onClick={() => removeCC(cc.id)}
                  className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg transition-all border-none cursor-pointer text-text-tertiary hover:text-accent-red hover:bg-accent-red/10 bg-transparent"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              <div className="space-y-0.5 ml-4">
                {cc.items.map((it, ii) => (
                  <div
                    key={it.id || ii}
                    className="flex items-center gap-2 py-1.5 px-3 rounded-lg transition-all hover:bg-surface-tertiary/50"
                  >
                    <button
                      onClick={() => openEditEI(cc.id, it)}
                      className="flex-1 text-left text-[11px] border-none bg-transparent cursor-pointer p-0 transition-colors text-text-secondary hover:text-accent-blue"
                    >{it.name}</button>
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-semibold",
                        it.type === "F"
                          ? "bg-accent-blue/10 text-accent-blue"
                          : "bg-accent-amber/10 text-accent-amber"
                      )}
                    >
                      {it.type === "F" ? "Fixo" : "Var"}
                    </span>
                    <input
                      type="number"
                      value={it.amounts?.[curMo] || ""}
                      onChange={(e) => updateExp(ci, ii, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className={inp}
                      placeholder="0"
                      style={{ width: "80px" }}
                    />
                    <button
                      onClick={() => removeExp(ci, ii)}
                      className="p-1 rounded-md text-text-tertiary hover:text-accent-red transition-all border-none bg-transparent cursor-pointer"
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
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className={lbl}>
              Nome
            </label>
            <input
              value={neN}
              onChange={(e) => setNeN(e.target.value)}
              className={inpFull}
              placeholder="Ex: Limpeza"
              autoFocus
            />
          </div>
          <div>
            <label className={lbl}>
              Tipo
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setNeT("F")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors",
                  neT === "F"
                    ? "bg-accent-blue/10 text-accent-blue border-accent-blue/30"
                    : "bg-surface-tertiary text-text-secondary border-transparent hover:text-text-primary"
                )}
              >Fixo</button>
              <button
                onClick={() => setNeT("V")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors",
                  neT === "V"
                    ? "bg-accent-amber/10 text-accent-amber border-accent-amber/30"
                    : "bg-surface-tertiary text-text-secondary border-transparent hover:text-text-primary"
                )}
              >Var</button>
            </div>
          </div>
          <button
            onClick={confirmAddExp}
            className="w-full py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer mt-2"
          >
            Adicionar
          </button>
        </div>
      </Modal>

      {/* Modal Novo Centro de Custo */}
      <Modal
        open={showAddCC}
        onOpenChange={(v) => { if (!v) setShowAddCC(false); }}
        title="Novo Centro de Custo"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className={lbl}>
              Sugestões
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SUGGESTED_CC.map((sug) => (
                <button
                  key={sug.name}
                  onClick={() => { setNcName(sug.name); setNcColor(sug.color); }}
                  className={cn(
                    "px-2.5 py-1 text-[10px] rounded-md border transition-all cursor-pointer font-medium",
                    ncName === sug.name
                      ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                      : "bg-surface-tertiary border-border-secondary text-text-secondary hover:text-text-primary"
                  )}
                >
                  {sug.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={lbl}>
              Nome do Centro de Custo
            </label>
            <input
              value={ncName}
              onChange={(e) => setNcName(e.target.value)}
              className={inpFull}
              placeholder="Ex: Manutenção"
              autoFocus
            />
          </div>
          <div>
            <label className={lbl}>
              Cor
            </label>
            <div className="flex gap-2 flex-wrap">
              {CCC.map((c) => (
                <button
                  key={c}
                  onClick={() => setNcColor(c)}
                  className={cn(
                    "w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110 border-2",
                    ncColor === c ? "border-text-primary" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={confirmAddCC}
            className="w-full py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer mt-2"
          >
            Criar Centro de Custo
          </button>
        </div>
      </Modal>

      {/* Modal Editar Centro de Custo */}
      <Modal
        open={!!editCC}
        onOpenChange={(v) => { if (!v) setEditCC(null); }}
        title="Editar Centro de Custo"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className={lbl}>Nome</label>
            <input value={ecName} onChange={(e) => setEcName(e.target.value)} className={inpFull} autoFocus />
          </div>
          <div>
            <label className={lbl}>Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CCC.map((c) => (
                <button
                  key={c}
                  onClick={() => setEcColor(c)}
                  className={cn(
                    "w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110 border-2",
                    ecColor === c ? "border-text-primary" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button onClick={saveEditCC} className="w-full py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer mt-2">
            Salvar
          </button>
        </div>
      </Modal>

      {/* Modal Editar Item de Despesa */}
      <Modal
        open={!!editEI}
        onOpenChange={(v) => { if (!v) setEditEI(null); }}
        title="Editar Item de Despesa"
        size="sm"
      >
        <div className="space-y-4">
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
                  "flex-1 py-2.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors",
                  eiType === "F"
                    ? "bg-accent-blue/10 text-accent-blue border-accent-blue/30"
                    : "bg-surface-tertiary text-text-secondary border-transparent hover:text-text-primary"
                )}
              >Fixo</button>
              <button
                onClick={() => setEiType("V")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors",
                  eiType === "V"
                    ? "bg-accent-amber/10 text-accent-amber border-accent-amber/30"
                    : "bg-surface-tertiary text-text-secondary border-transparent hover:text-text-primary"
                )}
              >Variável</button>
            </div>
          </div>
          <button onClick={saveEditEI} className="w-full py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer mt-2">
            Salvar
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
      />

      {/* Modal Nova Receita */}
      <Modal
        open={showAddRev}
        onOpenChange={setShowAddRev}
        title="Nova Categoria de Receita"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className={lbl}>Nome</label>
            <input
              value={nrName}
              onChange={(e) => setNrName(e.target.value)}
              placeholder="Ex: Aluguel de Estúdio"
              className={inpFull}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") confirmAddRev(); }}
            />
          </div>
          <button
            onClick={confirmAddRev}
            className="w-full py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer mt-2"
          >
            Criar Receita
          </button>
        </div>
      </Modal>

      {/* Modal Editar Receita */}
      <Modal
        open={!!editRev}
        onOpenChange={(v) => { if (!v) setEditRev(null); }}
        title="Editar Categoria de Receita"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className={lbl}>Nome</label>
            <input
              value={editRev?.name || ""}
              onChange={(e) => setEditRev(prev => prev ? { ...prev, name: e.target.value } : null)}
              className={inpFull}
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { if (editRev) removeRev(editRev.id); setEditRev(null); }}
              className="flex-1 py-2.5 rounded-lg bg-surface-tertiary text-accent-red text-xs font-semibold hover:bg-accent-red/10 transition-all border border-border-secondary cursor-pointer"
            >
              Excluir
            </button>
            <button
              onClick={saveEditRev}
              className="flex-1 py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
