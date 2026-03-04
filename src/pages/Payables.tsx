import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { MonthSelector } from "../components/MonthSelector";
import { Select, DatePicker, Modal, ConfirmModal, useConfirm } from "../components/ui";
import { brl, MS, MF, cn } from "../lib/utils";
import {
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  Receipt,
  Repeat,
  Zap,
  CreditCard,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { PayableBill } from "../types";

const COLORS = ["#0ea5e9", "#f97316", "#ec4899", "#84cc16", "#64748b", "#8b5cf6", "#14b8a6", "#f43f5e"];

export const Payables = () => {
  const { data, curMo, setCurMo, handleSaveBills, handleToggleBillStatus, handleDeleteBills, handleUpdateBill, handleAddCostCenter, handleAddExpenseItem } = useData();
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [ccId, setCcId] = useState("");
  const [eiId, setEiId] = useState("");
  const [type, setType] = useState<"UNIQUE" | "RECURRENT_FIXED" | "RECURRENT_VARIABLE" | "INSTALLMENT">("UNIQUE");
  const [installments, setInstallments] = useState("2");

  const [isNewCc, setIsNewCc] = useState(false);
  const [newCcName, setNewCcName] = useState("");
  const [isNewEi, setIsNewEi] = useState(false);
  const [newEiName, setNewEiName] = useState("");

  const [editingBill, setEditingBill] = useState<PayableBill | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");

  const { state: confirmState, confirm, close: confirmClose } = useConfirm();

  if (!data) return null;

  const cd = "rounded-xl p-4 shadow-sm border bg-surface-secondary border-border-primary";
  const inp = "w-full px-3 py-2.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-border-hover transition-all bg-surface-tertiary border-border-secondary text-text-primary";
  const lbl = "text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider";

  const curMonthBills = data.payableBills.filter((b) => {
    const d = new Date(b.dueDate + "T12:00:00");
    return d.getMonth() === curMo && d.getFullYear() === data.config.year;
  });

  const totalMonth = curMonthBills.reduce((acc, b) => acc + b.amount, 0);
  const totalPaid = curMonthBills.filter((b) => b.status === "PAID").reduce((acc, b) => acc + b.amount, 0);
  const totalPending = totalMonth - totalPaid;

  // Build select options for categories and expense items
  const ccOptions = data.expenses.map((cc) => ({ value: cc.id, label: cc.name }));
  const eiOptions = ccId
    ? (data.expenses.find((c) => c.id === ccId)?.items.map((ei) => ({ value: ei.id, label: ei.name })) || [])
    : [];

  const handleSaveBill = async () => {
    if (!desc.trim() || !amount || !dueDate) return;
    if (!isNewCc && !ccId) return;
    if (isNewCc && !newCcName.trim()) return;
    if (isNewEi && !newEiName.trim()) return;

    let finalCcId = ccId;
    let finalEiId = eiId;

    if (isNewCc) {
      finalCcId = await handleAddCostCenter({ name: newCcName.trim(), color: COLORS[data.expenses.length % COLORS.length] });
      if (!finalCcId) return;
    }

    if (isNewEi) {
      const eiType = type === "RECURRENT_VARIABLE" ? "V" as const : "F" as const;
      finalEiId = await handleAddExpenseItem(finalCcId, { name: newEiName.trim(), type: eiType });
      if (!finalEiId) return;
    }

    const baseDate = new Date(dueDate + "T12:00:00");
    const startMonth = baseDate.getMonth();
    const startYear = baseDate.getFullYear();

    const billsToCreate: PayableBill[] = [];
    const expenseUpdates: Array<{ ccId: string; eiId: string; month: number; delta: number }> = [];
    const groupId = "grp" + Date.now();
    const baseAmount = Number(amount);

    const hasExpenseItem = !!finalEiId;

    if (type === "UNIQUE") {
      billsToCreate.push({
        id: "temp",
        description: desc.trim(),
        costCenterId: finalCcId,
        expenseItemId: finalEiId,
        type,
        amount: baseAmount,
        dueDate: dueDate,
        status: "PENDING",
      });
      if (hasExpenseItem && startYear === data.config.year) {
        expenseUpdates.push({ ccId: finalCcId, eiId: finalEiId, month: startMonth, delta: baseAmount });
      }
    } else if (type === "INSTALLMENT") {
      const instCount = Number(installments);
      const installmentAmount = baseAmount / instCount;
      for (let i = 0; i < instCount; i++) {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i);
        if (d.getFullYear() === data.config.year) {
          billsToCreate.push({
            id: "temp" + i,
            description: `${desc.trim()} (${i + 1}/${instCount})`,
            costCenterId: finalCcId,
            expenseItemId: finalEiId,
            type,
            amount: installmentAmount,
            dueDate: d.toISOString().split("T")[0],
            totalInstallments: instCount,
            currentInstallment: i + 1,
            status: "PENDING",
            groupId,
          });
          if (hasExpenseItem) expenseUpdates.push({ ccId: finalCcId, eiId: finalEiId, month: d.getMonth(), delta: installmentAmount });
        }
      }
    } else {
      for (let i = startMonth; i < 12; i++) {
        const d = new Date(baseDate);
        d.setMonth(i);
        billsToCreate.push({
          id: "temp" + i,
          description: desc.trim(),
          costCenterId: finalCcId,
          expenseItemId: finalEiId,
          type,
          amount: baseAmount,
          dueDate: d.toISOString().split("T")[0],
          status: "PENDING",
          groupId,
        });
        if (hasExpenseItem) expenseUpdates.push({ ccId: finalCcId, eiId: finalEiId, month: i, delta: baseAmount });
      }
    }

    await handleSaveBills(billsToCreate, expenseUpdates);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setDesc(""); setAmount(""); setDueDate(""); setCcId(""); setEiId("");
    setType("UNIQUE"); setInstallments("2");
    setIsNewCc(false); setNewCcName(""); setIsNewEi(false); setNewEiName("");
  };

  const toggleStatus = (billId: string) => { handleToggleBillStatus(billId); };

  const performDeleteBills = async (bills: PayableBill[]) => {
    const expenseUpdates: Array<{ ccId: string; eiId: string; month: number; delta: number }> = [];
    bills.forEach((b) => {
      const billMonth = new Date(b.dueDate + "T12:00:00").getMonth();
      if (b.costCenterId && b.expenseItemId) {
        expenseUpdates.push({ ccId: b.costCenterId, eiId: b.expenseItemId, month: billMonth, delta: -b.amount });
      }
    });
    await handleDeleteBills(bills.map((b) => b.id), expenseUpdates);
  };

  const deleteBill = (billId: string) => {
    const bill = data.payableBills.find((b) => b.id === billId);
    if (!bill) return;

    if (bill.groupId) {
      confirm({
        title: "Excluir Série",
        message: "Esta conta faz parte de uma série. Deseja excluir esta e todas as contas futuras da série?",
        confirmLabel: "Excluir Série",
        variant: "danger",
        onConfirm: () => {
          const futureBills = data.payableBills.filter(
            (b) => b.groupId === bill.groupId && new Date(b.dueDate + "T12:00:00") >= new Date(bill.dueDate + "T12:00:00")
          );
          performDeleteBills(futureBills);
        },
      });
    } else {
      confirm({
        title: "Excluir Conta",
        message: "Tem certeza que deseja excluir esta conta?",
        confirmLabel: "Excluir",
        variant: "danger",
        onConfirm: () => performDeleteBills([bill]),
      });
    }
  };

  const saveEdit = async () => {
    if (!editingBill || !editAmount || !editDate) return;
    const newAmt = Number(editAmount);
    const oldMonth = new Date(editingBill.dueDate + "T12:00:00").getMonth();
    const newMonth = new Date(editDate + "T12:00:00").getMonth();

    const expenseUpdates: Array<{ ccId: string; eiId: string; month: number; delta: number }> = [];
    if (editingBill.costCenterId && editingBill.expenseItemId) {
      if (oldMonth === newMonth) {
        const diff = newAmt - editingBill.amount;
        if (diff !== 0) expenseUpdates.push({ ccId: editingBill.costCenterId, eiId: editingBill.expenseItemId, month: oldMonth, delta: diff });
      } else {
        expenseUpdates.push({ ccId: editingBill.costCenterId, eiId: editingBill.expenseItemId, month: oldMonth, delta: -editingBill.amount });
        expenseUpdates.push({ ccId: editingBill.costCenterId, eiId: editingBill.expenseItemId, month: newMonth, delta: newAmt });
      }
    }

    await handleUpdateBill(editingBill.id, { amount: newAmt, dueDate: editDate }, expenseUpdates);
    setEditingBill(null);
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case "RECURRENT_FIXED":    return <Repeat size={14} className="text-blue-500" />;
      case "RECURRENT_VARIABLE": return <Zap size={14} className="text-amber-500" />;
      case "INSTALLMENT":        return <CreditCard size={14} className="text-purple-500" />;
      default:                   return <Receipt size={14} className="text-slate-500" />;
    }
  };

  const getCcName = (id: string) => data.expenses.find((c) => c.id === id)?.name || "Desconhecido";
  const getCcColor = (id: string) => data.expenses.find((c) => c.id === id)?.color || "#94a3b8";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border-primary pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Contas a Pagar</h1>
          <p className="text-xs mt-1 text-text-secondary">
            {MF[curMo]} · {data.config.year}
          </p>
        </div>
        <MonthSelector curMo={curMo} setCurMo={setCurMo} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 shadow-sm border bg-surface-secondary border-border-primary">
          <p className="text-[10px] font-semibold mb-1 text-text-secondary uppercase tracking-wider">Total do Mês</p>
          <p className="text-2xl font-mono font-bold text-text-primary">{brl(totalMonth)}</p>
        </div>
        <div className="rounded-xl p-4 shadow-sm border bg-surface-tertiary border-border-secondary">
          <p className="text-[10px] font-semibold mb-1 text-accent-green uppercase tracking-wider">Total Pago</p>
          <p className="text-2xl font-mono font-bold text-accent-green">{brl(totalPaid)}</p>
        </div>
        <div className="rounded-xl p-4 shadow-sm border bg-surface-tertiary border-border-secondary">
          <p className="text-[10px] font-semibold mb-1 text-accent-red uppercase tracking-wider">Total Pendente</p>
          <p className="text-2xl font-mono font-bold text-accent-red">{brl(totalPending)}</p>
        </div>
      </div>

      <div className={cd}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Lançamentos de {MF[curMo]}</h3>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer"
          >
            <Plus size={14} /> Nova Conta
          </button>
        </div>

        {curMonthBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-surface-tertiary flex items-center justify-center mb-3 text-text-tertiary">
              <Receipt size={24} />
            </div>
            <p className="text-sm font-medium text-text-primary">Nenhuma conta neste mês</p>
            <p className="text-[11px] mt-1 text-text-secondary">Clique em "Nova Conta" para adicionar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {curMonthBills.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((bill) => {
              const isPaid = bill.status === "PAID";
              return (
                <div
                  key={bill.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                    isPaid
                      ? "bg-accent-green/5 border-accent-green/20 opacity-70"
                      : "bg-surface-tertiary border-border-secondary hover:border-border-hover"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleStatus(bill.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer text-[10px] font-bold",
                        isPaid
                          ? "bg-accent-green/10 border-transparent text-accent-green"
                          : "bg-surface-primary border-border-primary text-text-tertiary hover:bg-surface-tertiary"
                      )}
                    >
                      {isPaid ? <CheckCircle size={14} /> : <Circle size={14} />}
                      {isPaid ? "PAGO" : "PENDENTE"}
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-surface-primary flex items-center justify-center border border-border-primary">
                      {getTypeIcon(bill.type)}
                    </div>
                    <div>
                      <p className={cn("text-xs font-semibold", isPaid ? "text-accent-green line-through" : "text-text-primary")}>
                        {bill.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[9px] font-medium" style={{ color: getCcColor(bill.costCenterId) }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCcColor(bill.costCenterId) }}></span>
                          {getCcName(bill.costCenterId)}
                        </span>
                        <span className="text-[9px] flex items-center gap-1 text-text-secondary font-mono">
                          <CalendarIcon size={10} />
                          {bill.dueDate.split("-").reverse().join("/")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className="cursor-pointer hover:opacity-80 transition-all text-right"
                      onClick={() => { setEditingBill(bill); setEditAmount(bill.amount.toString()); setEditDate(bill.dueDate); }}
                    >
                      <p className={cn("text-sm font-mono font-bold", isPaid ? "text-accent-green" : "text-text-primary")}>
                        {brl(bill.amount)}
                      </p>
                      <p className="text-[9px] underline text-text-tertiary">Editar</p>
                    </div>
                    <button
                      onClick={() => deleteBill(bill.id)}
                      className="p-1.5 rounded-md text-text-tertiary hover:text-accent-red hover:bg-accent-red/10 transition-all border-none bg-transparent cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nova Conta */}
      <Modal
        open={showModal}
        onOpenChange={(v) => { if (!v) { setShowModal(false); resetForm(); } }}
        title="Nova Conta a Pagar"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className={lbl}>Descrição</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inp} placeholder="Ex: Conta de Luz" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Valor Total (R$)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inp} placeholder="0,00" />
            </div>
            <div>
              <label className={lbl}>Vencimento</label>
              <DatePicker value={dueDate} onChange={setDueDate} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={lbl}>Centro de Custo</label>
                <button onClick={() => setIsNewCc(!isNewCc)} className="text-[9px] text-accent-blue font-semibold border-none bg-transparent cursor-pointer">
                  {isNewCc ? "Selecionar" : "+ Novo Centro"}
                </button>
              </div>
              {isNewCc ? (
                <input value={newCcName} onChange={(e) => setNewCcName(e.target.value)} className={inp} placeholder="Ex: Pessoal, Admin..." />
              ) : (
                <Select
                  value={ccId}
                  onValueChange={(v) => { setCcId(v); setEiId(""); }}
                  options={ccOptions}
                  placeholder="Selecione..."
                />
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={lbl}>Item de Despesa</label>
                <button onClick={() => setIsNewEi(!isNewEi)} className="text-[9px] text-accent-blue font-semibold border-none bg-transparent cursor-pointer">
                  {isNewEi ? "Selecionar" : "+ Novo Item"}
                </button>
              </div>
              {isNewEi ? (
                <input value={newEiName} onChange={(e) => setNewEiName(e.target.value)} className={inp} placeholder="Ex: Aluguel, Salários..." />
              ) : (
                <Select
                  value={eiId}
                  onValueChange={setEiId}
                  options={eiOptions}
                  placeholder={eiOptions.length === 0 && ccId ? "Crie um novo item" : "Selecione..."}
                  disabled={!ccId || isNewCc}
                />
              )}
            </div>
          </div>

          <div>
            <label className={cn(lbl, "mb-2")}>Tipo de Conta</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "UNIQUE", label: "Única", icon: Receipt },
                { id: "RECURRENT_FIXED", label: "Fixa", icon: Repeat },
                { id: "RECURRENT_VARIABLE", label: "Variável", icon: Zap },
                { id: "INSTALLMENT", label: "Parcelada", icon: CreditCard },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id as typeof type)}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer text-[11px] font-semibold",
                    type === t.id
                      ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                      : "bg-surface-tertiary border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          {type === "INSTALLMENT" && (
            <div>
              <label className={lbl}>Número de Parcelas</label>
              <input type="number" value={installments} onChange={(e) => setInstallments(e.target.value)} className={inp} min="2" max="48" />
              <p className="text-[9px] mt-1 text-text-tertiary">O valor total será dividido por {installments || 2}.</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSaveBill}
            className="flex-1 py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer mt-2"
          >
            Salvar Conta
          </button>
        </div>
      </Modal>

      {/* Modal Editar Conta */}
      <Modal
        open={!!editingBill}
        onOpenChange={(v) => { if (!v) setEditingBill(null); }}
        title="Editar Conta"
        size="sm"
      >
        <p className="text-xs font-semibold mb-4 -mt-2 text-text-secondary">{editingBill?.description}</p>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Valor (R$)</label>
            <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className={inp} autoFocus />
          </div>
          <div>
            <label className={lbl}>Vencimento</label>
            <DatePicker value={editDate} onChange={setEditDate} />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={saveEdit}
            className="flex-1 py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer mt-2"
          >
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
    </div>
  );
};
