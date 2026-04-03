import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { MonthSelector } from "../components/MonthSelector";
import { Select, DatePicker, Modal, ConfirmModal, useConfirm } from "../components/ui";
import { brl, MS, MF, cn } from "../lib/utils";
import { createExpenseAllocationUpdate, isBillInCompetenceMonth } from "../lib/payables";
import {
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  Receipt,
  Repeat,
  CreditCard,
  Calendar as CalendarIcon,
} from "lucide-react";
import { ExpenseAllocationUpdate, PayableBill } from "../types";

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
  const [type, setType] = useState<"UNIQUE" | "RECURRENT" | "INSTALLMENT">("UNIQUE");
  const [installments, setInstallments] = useState("2");
  const [billStatus, setBillStatus] = useState<"PENDING" | "PAID">("PENDING");
  const [paidAt, setPaidAt] = useState("");
  const [competenceMonth, setCompetenceMonth] = useState<string>(String(curMo));
  const [competenceYear, setCompetenceYear] = useState<string>("");

  const [isNewCc, setIsNewCc] = useState(false);
  const [newCcName, setNewCcName] = useState("");
  const [isNewEi, setIsNewEi] = useState(false);
  const [newEiName, setNewEiName] = useState("");
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [isSubmittingNewBill, setIsSubmittingNewBill] = useState(false);

  const [editingBill, setEditingBill] = useState<PayableBill | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<"UNIQUE" | "RECURRENT" | "INSTALLMENT">("UNIQUE");
  const [editCcId, setEditCcId] = useState("");
  const [editEiId, setEditEiId] = useState("");
  const [editStatus, setEditStatus] = useState<"PENDING" | "PAID">("PENDING");
  const [editCompMo, setEditCompMo] = useState("");
  const [editFormError, setEditFormError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const { state: confirmState, confirm, close: confirmClose } = useConfirm();

  if (!data) return null;

  const cd = "rounded-xl p-4 shadow-sm border bg-surface-secondary border-border-primary";
  const inp = "w-full px-3 py-2.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-border-hover transition-all bg-surface-tertiary border-border-secondary text-text-primary";
  const lbl = "text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider";

  const curMonthBills = data.payableBills.filter((b) => isBillInCompetenceMonth(b, curMo, data.config.year));

  const totalMonth = curMonthBills.reduce((acc, b) => acc + b.amount, 0);
  const totalPaid = curMonthBills.filter((b) => b.status === "PAID").reduce((acc, b) => acc + b.amount, 0);
  const totalPending = totalMonth - totalPaid;

  const ccOptions = data.expenses.map((cc) => ({ value: cc.id, label: cc.name }));
  const eiOptions = ccId
    ? (data.expenses.find((c) => c.id === ccId)?.items.map((ei) => ({ value: ei.id, label: ei.name })) || [])
    : [];
  const editEiOptions = editCcId
    ? (data.expenses.find((c) => c.id === editCcId)?.items.map((ei) => ({ value: ei.id, label: ei.name })) || [])
    : [];

  const monthOptions = MF.map((m, i) => ({ value: String(i), label: m }));

  const handleSaveBill = async () => {
    setFormError("");
    setPageError("");
    if (!desc.trim()) { setFormError("Preencha a descrição."); return; }
    if (!dueDate) { setFormError("Selecione a data de vencimento."); return; }
    if (!amount || Number(amount) <= 0) { setFormError("Informe o valor."); return; }
    if (!isNewCc && !ccId) { setFormError("Selecione um centro de custo."); return; }
    if (isNewCc && !newCcName.trim()) { setFormError("Informe o nome do novo centro de custo."); return; }
    if (isNewEi && !newEiName.trim()) { setFormError("Informe o nome do novo item de despesa."); return; }

    let finalCcId = ccId;
    let finalEiId = eiId;

    if (isNewCc) {
      finalCcId = await handleAddCostCenter({ name: newCcName.trim(), color: COLORS[data.expenses.length % COLORS.length] });
      if (!finalCcId) {
        setFormError("Erro ao criar centro de custo. Tente novamente.");
        return;
      }
    }

    if (isNewEi) {
      finalEiId = await handleAddExpenseItem(finalCcId, { name: newEiName.trim(), type: "F" as const });
      if (!finalEiId) {
        setFormError("Erro ao criar item de despesa. Tente novamente.");
        return;
      }
    }

    const baseDate = new Date(dueDate + "T12:00:00");
    const startMonth = baseDate.getMonth();

    const billsToCreate: PayableBill[] = [];
    const expenseUpdates: ExpenseAllocationUpdate[] = [];
    const groupId = crypto.randomUUID();
    const baseAmount = Number(amount);
    const compMo = Number(competenceMonth);
    const compYr = Number(competenceYear) || data.config.year;

    const hasExpenseItem = !!finalEiId;

    const baseBill = {
      description: desc.trim(),
      costCenterId: finalCcId,
      expenseItemId: finalEiId,
      status: billStatus,
      paidAmount: billStatus === "PAID" ? baseAmount : undefined,
      paidAt: billStatus === "PAID" ? (paidAt || dueDate) : undefined,
    };

    if (type === "UNIQUE") {
      billsToCreate.push({
        id: "temp",
        ...baseBill,
        type,
        amount: baseAmount,
        dueDate: dueDate,
        competenceMonth: compMo,
        competenceYear: compYr,
      });
      if (hasExpenseItem) {
        const update = createExpenseAllocationUpdate({
          ...baseBill,
          amount: baseAmount,
          dueDate,
          competenceMonth: compMo,
          competenceYear: compYr,
        }, baseAmount, data.config.year);
        if (update) expenseUpdates.push(update);
      }
    } else if (type === "INSTALLMENT") {
      const instCount = Number(installments);
      if (!instCount || instCount < 2) { setFormError("Informe um número válido de parcelas."); return; }
      const installmentAmount = baseAmount / instCount;
      for (let i = 0; i < instCount; i++) {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i);
        if (d.getFullYear() === data.config.year) {
          billsToCreate.push({
            id: "temp" + i,
            ...baseBill,
            status: i === 0 ? billStatus : "PENDING",
            paidAmount: i === 0 && billStatus === "PAID" ? installmentAmount : undefined,
            paidAt: i === 0 && billStatus === "PAID" ? (paidAt || dueDate) : undefined,
            description: `${desc.trim()} (${i + 1}/${instCount})`,
            type,
            amount: installmentAmount,
            dueDate: d.toISOString().split("T")[0],
            totalInstallments: instCount,
            currentInstallment: i + 1,
            groupId,
            competenceMonth: d.getMonth(),
            competenceYear: d.getFullYear(),
          });
          if (hasExpenseItem) {
            const update = createExpenseAllocationUpdate({
              ...baseBill,
              amount: installmentAmount,
              dueDate: d.toISOString().split("T")[0],
              competenceMonth: d.getMonth(),
              competenceYear: d.getFullYear(),
            }, installmentAmount, data.config.year);
            if (update) expenseUpdates.push(update);
          }
        }
      }
    } else {
      for (let i = startMonth; i < 12; i++) {
        const d = new Date(baseDate);
        d.setMonth(i);
        billsToCreate.push({
          id: "temp" + i,
          ...baseBill,
          status: i === startMonth ? billStatus : "PENDING",
          paidAmount: i === startMonth && billStatus === "PAID" ? baseAmount : undefined,
          paidAt: i === startMonth && billStatus === "PAID" ? (paidAt || dueDate) : undefined,
          type,
          amount: baseAmount,
          dueDate: d.toISOString().split("T")[0],
          groupId,
          competenceMonth: i,
          competenceYear: data.config.year,
        });
        if (hasExpenseItem) {
          const update = createExpenseAllocationUpdate({
            ...baseBill,
            amount: baseAmount,
            dueDate: d.toISOString().split("T")[0],
            competenceMonth: i,
            competenceYear: data.config.year,
          }, baseAmount, data.config.year);
          if (update) expenseUpdates.push(update);
        }
      }
    }

    if (billsToCreate.length === 0) {
      setFormError("Nenhuma conta foi gerada para o ano selecionado.");
      return;
    }

    setIsSubmittingNewBill(true);
    try {
      await handleSaveBills(billsToCreate, expenseUpdates);
      setShowModal(false);
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao salvar contas.");
    } finally {
      setIsSubmittingNewBill(false);
    }
  };

  const resetForm = () => {
    setDesc(""); setAmount(""); setDueDate(""); setCcId(""); setEiId("");
    setType("UNIQUE"); setInstallments("2"); setBillStatus("PENDING"); setPaidAt("");
    setCompetenceMonth(String(curMo)); setCompetenceYear("");
    setIsNewCc(false); setNewCcName(""); setIsNewEi(false); setNewEiName("");
    setFormError("");
  };

  const toggleStatus = (billId: string) => { handleToggleBillStatus(billId); };

  const performDeleteBills = async (bills: PayableBill[]) => {
    setPageError("");
    const expenseUpdates: ExpenseAllocationUpdate[] = [];
    bills.forEach((b) => {
      const update = createExpenseAllocationUpdate(b, -b.amount, data.config.year);
      if (update) expenseUpdates.push(update);
    });
    try {
      await handleDeleteBills(bills.map((b) => b.id), expenseUpdates);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Erro ao excluir conta.");
    }
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
    setEditFormError("");
    setPageError("");
    if (!editingBill || !editDesc.trim() || !editAmount || !editDate) {
      setEditFormError("Preencha os campos obrigatórios.");
      return;
    }

    const newAmt = Number(editAmount);
    const newMonth = Number(editCompMo);

    const expenseUpdates: ExpenseAllocationUpdate[] = [];
    
    const oldEiId = editingBill.expenseItemId;
    const newEiId = editEiId || "";
    const oldCcId = editingBill.costCenterId;
    const newCcId = editCcId || "";
    
    const updatedBill: PayableBill = {
      ...editingBill,
      description: editDesc.trim(),
      amount: newAmt,
      dueDate: editDate,
      type: editType,
      expenseItemId: newEiId || "",
      costCenterId: newCcId || "",
      status: editStatus,
      competenceMonth: newMonth,
      competenceYear: data.config.year,
    };

    const oldExpenseUpdate = createExpenseAllocationUpdate(editingBill, -editingBill.amount, data.config.year);
    const newExpenseUpdate = createExpenseAllocationUpdate(updatedBill, newAmt, data.config.year);
    if (oldExpenseUpdate) expenseUpdates.push(oldExpenseUpdate);
    if (newExpenseUpdate) expenseUpdates.push(newExpenseUpdate);

    setIsSavingEdit(true);
    try {
      await handleUpdateBill(editingBill.id, {
        description: editDesc.trim(),
        amount: newAmt,
        dueDate: editDate,
        type: editType,
        expenseItemId: newEiId || undefined,
        costCenterId: newCcId || undefined,
        status: editStatus,
        competenceMonth: newMonth,
        competenceYear: data.config.year,
      }, expenseUpdates);
      setEditingBill(null);
    } catch (error) {
      setEditFormError(error instanceof Error ? error.message : "Erro ao atualizar conta.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case "RECURRENT":
      case "RECURRENT_FIXED":
      case "RECURRENT_VARIABLE": return <Repeat size={14} className="text-blue-500" />;
      case "INSTALLMENT":        return <CreditCard size={14} className="text-purple-500" />;
      default:                   return <Receipt size={14} className="text-slate-500" />;
    }
  };

  const getTypeLabel = (t: string) => {
    switch (t) {
      case "RECURRENT":
      case "RECURRENT_FIXED":
      case "RECURRENT_VARIABLE": return "Recorrente";
      case "INSTALLMENT":        return "Parcelada";
      default:                   return "Única";
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
            onClick={() => { setCompetenceMonth(String(curMo)); setCompetenceYear(String(data.config.year)); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer"
          >
            <Plus size={14} /> Nova Conta
          </button>
        </div>

        {pageError && (
          <p className="text-xs text-accent-red font-medium mb-3">{pageError}</p>
        )}

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
                        <span className="text-[9px] text-text-tertiary">
                          {getTypeLabel(bill.type)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className="cursor-pointer hover:opacity-80 transition-all text-right"
                      onClick={() => {
                        setEditFormError("");
                        setEditingBill(bill);
                        setEditDesc(bill.description);
                        setEditAmount(bill.amount.toString());
                        setEditDate(bill.dueDate);
                        setEditType(bill.type as "UNIQUE" | "RECURRENT" | "INSTALLMENT");
                        setEditCcId(bill.costCenterId || "");
                        setEditEiId(bill.expenseItemId || "");
                        setEditStatus(bill.status as "PENDING" | "PAID");
                        setEditCompMo(bill.competenceMonth !== undefined ? String(bill.competenceMonth) : String(new Date(bill.dueDate + "T12:00:00").getMonth()));
                      }}
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
        onOpenChange={(v) => {
          if (!v && !isSubmittingNewBill) {
            setShowModal(false);
            resetForm();
          }
        }}
        title="Nova Conta a Pagar"
        size="md"
      >
        <div className="space-y-4">
          {/* A - Descricao */}
          <div>
            <label className={lbl}>Descrição</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inp} placeholder="Ex: Conta de Luz" autoFocus />
          </div>

          {/* B - Tipo de Lancamento */}
          <div>
            <label className={cn(lbl, "mb-2")}>Tipo de Lançamento</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "UNIQUE" as const, label: "Única", icon: Receipt, desc: "Pagamento avulso" },
                { id: "RECURRENT" as const, label: "Recorrente", icon: Repeat, desc: "Repete todo mês" },
                { id: "INSTALLMENT" as const, label: "Parcelada", icon: CreditCard, desc: "Divide em parcelas" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors cursor-pointer",
                    type === t.id
                      ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                      : "bg-surface-tertiary border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  <t.icon size={16} />
                  <span className="text-[11px] font-semibold">{t.label}</span>
                  <span className="text-[8px] opacity-70">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* C - Prazos e Competencia */}
          <div>
            <label className={cn(lbl, "mb-2")}>Prazos e Competência</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Vencimento *</label>
                <DatePicker value={dueDate} onChange={setDueDate} />
              </div>
              <div>
                <label className={lbl}>Mês de Competência *</label>
                <Select
                  value={competenceMonth}
                  onValueChange={setCompetenceMonth}
                  options={monthOptions}
                  placeholder="Selecione..."
                  disabled={type !== "UNIQUE"}
                />
                {type !== "UNIQUE" && (
                  <p className="text-[9px] mt-1 text-text-tertiary">
                    Para contas {type === "RECURRENT" ? "recorrentes" : "parceladas"}, a competência acompanha cada vencimento.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Valor + Parcelas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Valor Total (R$)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inp} placeholder="0,00" />
            </div>
            {type === "INSTALLMENT" && (
              <div>
                <label className={lbl}>Número de Parcelas</label>
                <input type="number" value={installments} onChange={(e) => setInstallments(e.target.value)} className={inp} min="2" max="48" />
                <p className="text-[9px] mt-1 text-text-tertiary">Valor por parcela: {brl(Number(amount) / (Number(installments) || 2))}</p>
              </div>
            )}
          </div>

          {/* D - Status do Pagamento */}
          <div>
            <label className={cn(lbl, "mb-2")}>Status do Pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBillStatus("PENDING")}
                className={cn(
                  "flex flex-col p-3 rounded-lg border transition-colors cursor-pointer",
                  billStatus === "PENDING"
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-surface-tertiary border-transparent"
                )}
              >
                <span className={cn("text-[11px] font-bold", billStatus === "PENDING" ? "text-amber-600" : "text-text-secondary")}>PENDENTE</span>
                <span className="text-[8px] text-text-tertiary mt-0.5">Ainda não pago</span>
              </button>
              <button
                onClick={() => setBillStatus("PAID")}
                className={cn(
                  "flex flex-col p-3 rounded-lg border transition-colors cursor-pointer",
                  billStatus === "PAID"
                    ? "bg-accent-green/10 border-accent-green/30"
                    : "bg-surface-tertiary border-transparent"
                )}
              >
                <span className={cn("text-[11px] font-bold", billStatus === "PAID" ? "text-accent-green" : "text-text-secondary")}>JÁ PAGO</span>
                <span className="text-[8px] text-text-tertiary mt-0.5">Lançamento realizado</span>
              </button>
            </div>
            {billStatus === "PAID" && (
              <div className="mt-3">
                <label className={lbl}>Data do Pagamento</label>
                <DatePicker value={paidAt} onChange={setPaidAt} />
                <p className="text-[9px] mt-1 text-text-tertiary">Se vazio, usa a data de vencimento.</p>
              </div>
            )}
          </div>

          {/* E - Centro de Custo / Item de Despesa */}
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
        </div>

        {formError && (
          <p className="text-xs text-accent-red font-medium mt-2">{formError}</p>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => { if (!isSubmittingNewBill) { setShowModal(false); resetForm(); } }}
            disabled={isSubmittingNewBill}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-border-secondary text-text-secondary hover:bg-surface-tertiary transition-colors cursor-pointer bg-transparent"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveBill}
            disabled={isSubmittingNewBill}
            className="flex-1 py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmittingNewBill ? "Salvando..." : "+ Confirmar Lançamento"}
          </button>
        </div>
      </Modal>

      {/* Modal Editar Conta */}
      <Modal
        open={!!editingBill}
        onOpenChange={(v) => { if (!v && !isSavingEdit) setEditingBill(null); }}
        title="Editar Conta"
        size="md"
      >
        <div className="space-y-4">
          {/* Descrição */}
          <div>
            <label className={lbl}>Descrição</label>
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className={inp}
              placeholder="Ex: Conta de Luz"
              autoFocus
            />
          </div>

          {/* Tipo de Lançamento */}
          <div>
            <label className={lbl}>Tipo de Lançamento</label>
            <div className="flex gap-2">
              {[
                { value: "UNIQUE", label: "Única", icon: Receipt },
                { value: "RECURRENT", label: "Recorrente", icon: Repeat },
                { value: "INSTALLMENT", label: "Parcelada", icon: CreditCard },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setEditType(value as typeof editType)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                    editType === value
                      ? "bg-primary-btn-bg text-primary-btn-text border-primary-btn-bg"
                      : "bg-surface-tertiary text-text-secondary border-border-secondary hover:border-border-hover"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Valor e Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Valor (R$)</label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className={inp}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className={lbl}>Vencimento</label>
              <DatePicker value={editDate} onChange={setEditDate} />
            </div>
          </div>

          {/* Mês de Competência */}
          <div>
            <label className={lbl}>Mês de Competência</label>
            <Select
              value={editCompMo}
              onValueChange={setEditCompMo}
              options={monthOptions}
              placeholder="Selecione..."
              disabled={editType !== "UNIQUE"}
            />
          </div>

          {/* Status */}
          <div>
            <label className={lbl}>Status do Pagamento</label>
            <div className="flex gap-2">
              <button
                onClick={() => setEditStatus("PENDING")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                  editStatus === "PENDING"
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                    : "bg-surface-tertiary text-text-secondary border-border-secondary hover:border-border-hover"
                )}
              >
                PENDENTE
              </button>
              <button
                onClick={() => setEditStatus("PAID")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                  editStatus === "PAID"
                    ? "bg-accent-green/20 text-accent-green border-accent-green/50"
                    : "bg-surface-tertiary text-text-secondary border-border-secondary hover:border-border-hover"
                )}
              >
                JÁ PAGO
              </button>
            </div>
          </div>

          {/* Centro de Custo */}
          <div>
            <label className={lbl}>Centro de Custo</label>
            <Select
              value={editCcId}
              onValueChange={(v) => { setEditCcId(v); setEditEiId(""); }}
              options={ccOptions}
              placeholder="Selecione..."
            />
          </div>

          {/* Item de Despesa */}
          <div>
            <label className={lbl}>Item de Despesa</label>
            <Select
              value={editEiId}
              onValueChange={setEditEiId}
              options={editEiOptions}
              placeholder="Selecione..."
              disabled={!editCcId}
            />
          </div>
        </div>

        {editFormError && (
          <p className="text-xs text-accent-red font-medium mt-2">{editFormError}</p>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => { if (!isSavingEdit) setEditingBill(null); }}
            disabled={isSavingEdit}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-border-secondary text-text-secondary hover:bg-surface-tertiary transition-colors cursor-pointer bg-transparent"
          >
            Cancelar
          </button>
          <button
            onClick={saveEdit}
            disabled={isSavingEdit}
            className="flex-1 py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSavingEdit ? "Salvando..." : "Salvar Alterações"}
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
