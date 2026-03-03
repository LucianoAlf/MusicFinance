import React, { useState } from "react";
import { useData } from "../context/DataContext";
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
  const { data, curMo, setCurMo, dark, handleSaveBills, handleToggleBillStatus, handleDeleteBills, handleUpdateBill, handleAddCostCenter, handleAddExpenseItem } = useData();
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

  if (!data) return null;

  const cd = cn(
    "rounded-2xl p-5 shadow-sm border",
    dark ? "bg-slate-800/80 border-slate-700/50" : "bg-white border-slate-100"
  );
  const inp = cn(
    "w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all",
    dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
  );

  const curMonthBills = data.payableBills.filter((b) => {
    const d = new Date(b.dueDate + "T12:00:00");
    return d.getMonth() === curMo && d.getFullYear() === data.config.year;
  });

  const totalMonth = curMonthBills.reduce((acc, b) => acc + b.amount, 0);
  const totalPaid = curMonthBills.filter((b) => b.status === "PAID").reduce((acc, b) => acc + b.amount, 0);
  const totalPending = totalMonth - totalPaid;

  const handleSaveBill = async () => {
    if (!desc.trim() || !amount || !dueDate) return;
    if (!isNewCc && !ccId) return;
    if (!isNewEi && !eiId) return;
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
      if (startYear === data.config.year) {
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
          expenseUpdates.push({ ccId: finalCcId, eiId: finalEiId, month: d.getMonth(), delta: installmentAmount });
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
        expenseUpdates.push({ ccId: finalCcId, eiId: finalEiId, month: i, delta: baseAmount });
      }
    }

    await handleSaveBills(billsToCreate, expenseUpdates);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setDesc("");
    setAmount("");
    setDueDate("");
    setCcId("");
    setEiId("");
    setType("UNIQUE");
    setInstallments("2");
    setIsNewCc(false);
    setNewCcName("");
    setIsNewEi(false);
    setNewEiName("");
  };

  const toggleStatus = (billId: string) => {
    handleToggleBillStatus(billId);
  };

  const deleteBill = async (billId: string) => {
    const bill = data.payableBills.find((b) => b.id === billId);
    if (!bill) return;

    let deleteAll = false;
    if (bill.groupId) {
      deleteAll = confirm("Esta conta faz parte de uma serie. Deseja excluir todas as contas futuras desta serie?");
    } else {
      if (!confirm("Excluir esta conta?")) return;
    }

    let billsToRemove = [bill];
    if (deleteAll && bill.groupId) {
      billsToRemove = data.payableBills.filter((b) => {
        if (b.groupId !== bill.groupId) return false;
        return new Date(b.dueDate + "T12:00:00") >= new Date(bill.dueDate + "T12:00:00");
      });
    }

    const expenseUpdates: Array<{ ccId: string; eiId: string; month: number; delta: number }> = [];
    billsToRemove.forEach((b) => {
      const billMonth = new Date(b.dueDate + "T12:00:00").getMonth();
      if (b.costCenterId && b.expenseItemId) {
        expenseUpdates.push({ ccId: b.costCenterId, eiId: b.expenseItemId, month: billMonth, delta: -b.amount });
      }
    });

    await handleDeleteBills(billsToRemove.map((b) => b.id), expenseUpdates);
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
      case "RECURRENT_FIXED":
        return <Repeat size={14} className="text-blue-500" />;
      case "RECURRENT_VARIABLE":
        return <Zap size={14} className="text-amber-500" />;
      case "INSTALLMENT":
        return <CreditCard size={14} className="text-purple-500" />;
      default:
        return <Receipt size={14} className="text-slate-500" />;
    }
  };

  const getCcName = (id: string) => data.expenses.find((c) => c.id === id)?.name || "Desconhecido";
  const getCcColor = (id: string) => data.expenses.find((c) => c.id === id)?.color || "#94a3b8";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className={cn("text-2xl font-bold", dark ? "text-white" : "text-slate-900")}>Contas a Pagar</h1>
          <p className={cn("text-xs mt-1", dark ? "text-slate-400" : "text-slate-500")}>
            {MF[curMo]} / {data.config.year}
          </p>
        </div>
        <div className="flex gap-0.5 flex-wrap">
          {MS.map((m, i) => (
            <button
              key={m}
              onClick={() => setCurMo(i)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border-none cursor-pointer",
                curMo === i
                  ? "bg-violet-600 text-white shadow-md"
                  : dark
                  ? "text-slate-400 hover:bg-slate-700 bg-transparent"
                  : "text-slate-500 hover:bg-slate-100 bg-transparent"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cn("rounded-2xl p-5 shadow-sm border", dark ? "bg-slate-800/80 border-slate-700/50" : "bg-white border-slate-100")}>
          <p className={cn("text-[11px] font-semibold mb-1", dark ? "text-slate-400" : "text-slate-500")}>Total do Mês</p>
          <p className={cn("text-2xl font-bold", dark ? "text-white" : "text-slate-900")}>{brl(totalMonth)}</p>
        </div>
        <div className={cn("rounded-2xl p-5 shadow-sm border", dark ? "bg-emerald-900/20 border-emerald-800/30" : "bg-emerald-50 border-emerald-100")}>
          <p className={cn("text-[11px] font-semibold mb-1", dark ? "text-emerald-400" : "text-emerald-600")}>Total Pago</p>
          <p className={cn("text-2xl font-bold", dark ? "text-emerald-400" : "text-emerald-700")}>{brl(totalPaid)}</p>
        </div>
        <div className={cn("rounded-2xl p-5 shadow-sm border", dark ? "bg-rose-900/20 border-rose-800/30" : "bg-rose-50 border-rose-100")}>
          <p className={cn("text-[11px] font-semibold mb-1", dark ? "text-rose-400" : "text-rose-600")}>Total Pendente</p>
          <p className={cn("text-2xl font-bold", dark ? "text-rose-400" : "text-rose-700")}>{brl(totalPending)}</p>
        </div>
      </div>

      <div className={cd}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn("text-sm font-bold", dark ? "text-white" : "text-slate-900")}>Lançamentos de {MF[curMo]}</h3>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-[11px] font-semibold shadow-lg shadow-violet-500/25 hover:shadow-xl transition-all border-none cursor-pointer"
          >
            <Plus size={14} /> Nova Conta
          </button>
        </div>

        {curMonthBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-3", dark ? "bg-slate-800 text-slate-600" : "bg-slate-100 text-slate-300")}>
              <Receipt size={24} />
            </div>
            <p className={cn("text-sm font-medium", dark ? "text-slate-300" : "text-slate-600")}>Nenhuma conta neste mês</p>
            <p className={cn("text-[11px] mt-1", dark ? "text-slate-500" : "text-slate-400")}>Clique em "Nova Conta" para adicionar.</p>
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
                      ? dark ? "bg-emerald-900/10 border-emerald-800/30 opacity-70" : "bg-emerald-50/50 border-emerald-100 opacity-70"
                      : dark ? "bg-slate-800/60 border-slate-700/50 hover:bg-slate-800" : "bg-white border-slate-100 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleStatus(bill.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer text-[10px] font-bold",
                        isPaid 
                          ? dark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                          : dark ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {isPaid ? <CheckCircle size={14} /> : <Circle size={14} />}
                      {isPaid ? "PAGO" : "PENDENTE"}
                    </button>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", dark ? "bg-slate-700" : "bg-slate-100")}>
                      {getTypeIcon(bill.type)}
                    </div>
                    <div>
                      <p className={cn("text-xs font-semibold", isPaid ? (dark ? "text-emerald-400 line-through" : "text-emerald-700 line-through") : (dark ? "text-white" : "text-slate-900"))}>
                        {bill.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[9px] font-medium" style={{ color: getCcColor(bill.costCenterId) }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCcColor(bill.costCenterId) }}></span>
                          {getCcName(bill.costCenterId)}
                        </span>
                        <span className={cn("text-[9px] flex items-center gap-1", dark ? "text-slate-500" : "text-slate-400")}>
                          <CalendarIcon size={10} />
                          {bill.dueDate.split("-").reverse().join("/")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div 
                      className="cursor-pointer hover:opacity-80 transition-all text-right"
                      onClick={() => {
                        setEditingBill(bill);
                        setEditAmount(bill.amount.toString());
                        setEditDate(bill.dueDate);
                      }}
                    >
                      <p className={cn("text-sm font-bold", isPaid ? (dark ? "text-emerald-500" : "text-emerald-600") : (dark ? "text-white" : "text-slate-900"))}>
                        {brl(bill.amount)}
                      </p>
                      <p className={cn("text-[9px] underline", dark ? "text-slate-500" : "text-slate-400")}>Editar</p>
                    </div>
                    <button
                      onClick={() => deleteBill(bill.id)}
                      className="p-1.5 rounded-md text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 transition-all border-none bg-transparent cursor-pointer"
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cn("w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]", dark ? "bg-slate-800" : "bg-white")}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={cn("text-lg font-bold flex items-center gap-2", dark ? "text-white" : "text-slate-900")}>
                <Receipt size={20} className="text-violet-500" /> Nova Conta a Pagar
              </h3>
              <button onClick={() => setShowModal(false)} className={cn("p-1 rounded-md border-none cursor-pointer", dark ? "text-slate-400 hover:bg-slate-700" : "text-slate-500 hover:bg-slate-100")}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>Descrição</label>
                <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inp} placeholder="Ex: Conta de Luz" autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>Valor Total (R$)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inp} placeholder="0,00" />
                </div>
                <div>
                  <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>Vencimento</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inp} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={cn("text-[10px] font-semibold", dark ? "text-slate-400" : "text-slate-500")}>Categoria</label>
                    <button onClick={() => setIsNewCc(!isNewCc)} className="text-[9px] text-violet-500 font-semibold border-none bg-transparent cursor-pointer">
                      {isNewCc ? "Selecionar" : "+ Nova"}
                    </button>
                  </div>
                  {isNewCc ? (
                    <input value={newCcName} onChange={(e) => setNewCcName(e.target.value)} className={inp} placeholder="Nome da Categoria" />
                  ) : (
                    <select value={ccId} onChange={(e) => { setCcId(e.target.value); setEiId(""); }} className={inp}>
                      <option value="" disabled>Selecione...</option>
                      {data.expenses.map((cc) => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={cn("text-[10px] font-semibold", dark ? "text-slate-400" : "text-slate-500")}>Subcategoria</label>
                    <button onClick={() => setIsNewEi(!isNewEi)} className="text-[9px] text-violet-500 font-semibold border-none bg-transparent cursor-pointer">
                      {isNewEi ? "Selecionar" : "+ Nova"}
                    </button>
                  </div>
                  {isNewEi ? (
                    <input value={newEiName} onChange={(e) => setNewEiName(e.target.value)} className={inp} placeholder="Nome da Subcategoria" />
                  ) : (
                    <select value={eiId} onChange={(e) => setEiId(e.target.value)} className={inp} disabled={!ccId || isNewCc}>
                      <option value="" disabled>Selecione...</option>
                      {data.expenses.find((c) => c.id === ccId)?.items.map((ei) => <option key={ei.id} value={ei.id}>{ei.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className={cn("text-[10px] mb-2 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>Tipo de Conta</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "UNIQUE", label: "Única", icon: Receipt },
                    { id: "RECURRENT_FIXED", label: "Fixa", icon: Repeat },
                    { id: "RECURRENT_VARIABLE", label: "Variável", icon: Zap },
                    { id: "INSTALLMENT", label: "Parcelada", icon: CreditCard },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id as any)}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all cursor-pointer text-[11px] font-semibold",
                        type === t.id
                          ? dark ? "bg-violet-900/30 border-violet-500 text-violet-400" : "bg-violet-50 border-violet-500 text-violet-700"
                          : dark ? "bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      <t.icon size={14} /> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {type === "INSTALLMENT" && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>Número de Parcelas</label>
                  <input type="number" value={installments} onChange={(e) => setInstallments(e.target.value)} className={inp} min="2" max="48" />
                  <p className={cn("text-[9px] mt-1", dark ? "text-slate-500" : "text-slate-400")}>O valor total será dividido por {installments || 2}.</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveBill}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-violet-500/25 hover:shadow-xl transition-all border-none cursor-pointer"
              >
                Salvar Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cn("w-full max-w-sm rounded-2xl p-6 shadow-2xl", dark ? "bg-slate-800" : "bg-white")}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={cn("text-sm font-bold", dark ? "text-white" : "text-slate-900")}>
                Editar Conta
              </h3>
              <button onClick={() => setEditingBill(null)} className={cn("p-1 rounded-md border-none cursor-pointer", dark ? "text-slate-400 hover:bg-slate-700" : "text-slate-500 hover:bg-slate-100")}>
                <X size={16} />
              </button>
            </div>
            
            <p className={cn("text-xs font-semibold mb-4", dark ? "text-slate-300" : "text-slate-700")}>{editingBill.description}</p>

            <div className="space-y-4">
              <div>
                <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>Valor (R$)</label>
                <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className={inp} autoFocus />
              </div>
              <div>
                <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>Vencimento</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={inp} />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={saveEdit}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-lg border-none cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
