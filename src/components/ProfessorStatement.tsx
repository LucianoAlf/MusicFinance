import React, { useEffect, useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import {
  getProfessorCompensationLabel,
  getProfessorPayrollDetails,
  getProfessorStudentCostAllocation,
} from "../lib/professorCompensation";
import type { Professor } from "../types";
import { brl, MF, cn } from "../lib/utils";
import { Copy, Check, FileText } from "lucide-react";

interface Props {
  professor: Professor;
  month: number;
  year: number;
  schoolName: string;
  onClose: () => void;
}

export const ProfessorStatement: React.FC<Props> = ({ professor, month, year, schoolName, onClose }) => {
  const { handleSetProfessorPayrollOverride } = useData();
  const [copied, setCopied] = React.useState(false);
  const [overrideValue, setOverrideValue] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);
  const payroll = useMemo(() => getProfessorPayrollDetails(professor, year, month), [professor, year, month]);

  useEffect(() => {
    setOverrideValue(payroll.overrideAmount != null ? payroll.overrideAmount.toString() : "");
  }, [payroll.overrideAmount, professor.id, month]);

  const statement = useMemo(() => {
    const allocation = getProfessorStudentCostAllocation(professor, year, month);
    const rows = professor.students
      .filter((s) => s.situation === "Ativo" || (s.payments[month] && s.payments[month]!.status === "PAID"))
      .map((s) => {
        const pm = s.payments[month];
        const paid = pm && pm.status === "PAID" ? pm.amount : 0;
        const expected = s.tuitionAmount || 0;
        const cost = allocation.get(s.id) || 0;
        return {
          name: s.name,
          instrument: s.instrumentName || "—",
          expected,
          paid,
          cost,
          status: pm?.status || "PENDING",
          isActive: s.situation === "Ativo",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const totalExpected = rows.reduce((s, r) => s + r.expected, 0);
    const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
    const activeCount = rows.filter((r) => r.isActive).length;
    const totalCost = payroll.amount;
    const paidCount = rows.filter((r) => r.paid > 0).length;

    return { rows, totalExpected, totalPaid, totalCost, paidCount, activeCount };
  }, [professor, month, payroll.amount, year]);

  // WhatsApp: versão simplificada só para o professor
  const whatsappText = useMemo(() => {
    const activeRows = statement.rows.filter((r) => r.isActive);
    const lines: string[] = [];
    lines.push(`📋 *EXTRATO*`);
    lines.push(`*${professor.name}*`);
    lines.push(`${MF[month]} ${year} · ${schoolName}`);
    lines.push("");
    lines.push(`👥 *Alunos (${statement.activeCount})*`);
    activeRows.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.name} _(${r.instrument})_`);
    });
    lines.push("");
    lines.push(`💰 *Resumo*`);
    lines.push(`• Modelo: ${getProfessorCompensationLabel(professor)}`);
    if (professor.compensationType === "hourly") {
      lines.push(`• Aulas previstas: ${payroll.lessonCount}`);
    } else {
      lines.push(`• Total de alunos ativos: ${statement.activeCount}`);
    }
    if (payroll.overrideAmount != null) {
      lines.push(`• Ajuste manual aplicado: ${brl(payroll.overrideAmount)}`);
    }
    lines.push("");
    lines.push(`✅ *TOTAL A RECEBER: ${brl(statement.totalCost)}*`);
    return lines.join("\n");
  }, [professor, month, year, schoolName, statement, payroll]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveOverride = async () => {
    const parsed = overrideValue.trim() === "" ? null : Number(overrideValue);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      return;
    }

    setSavingOverride(true);
    try {
      await handleSetProfessorPayrollOverride(professor.id, month, parsed);
    } finally {
      setSavingOverride(false);
    }
  };

  const clearOverride = async () => {
    setOverrideValue("");
    setSavingOverride(true);
    try {
      await handleSetProfessorPayrollOverride(professor.id, month, null);
    } finally {
      setSavingOverride(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-text-tertiary" />
          <div>
            <h3 className="text-sm font-bold text-text-primary">{professor.name}</h3>
            <p className="text-[10px] text-text-secondary">
              {MF[month]} {year} · {professor.instruments.map((i) => i.name).join(", ") || professor.instrument}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-primary bg-surface-tertiary px-4 py-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-1">Modelo</p>
            <p className="text-xs font-medium text-text-primary">{getProfessorCompensationLabel(professor)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-1">Cálculo Automático</p>
            <p className="text-xs font-mono font-bold text-text-primary">{brl(payroll.autoAmount)}</p>
            {professor.compensationType === "hourly" && (
              <p className="text-[10px] text-text-tertiary">{payroll.lessonCount} aulas previstas no mês</p>
            )}
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-1">Folha Final</p>
            <p className="text-xs font-mono font-bold text-accent-red">{brl(payroll.amount)}</p>
            <p className="text-[10px] text-text-tertiary">
              {payroll.payrollSource === "override" ? "Com ajuste manual aplicado" : "Sem ajuste manual"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-col md:flex-row gap-2 md:items-end">
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-1">Ajuste Manual do Mês</p>
            <input
              type="number"
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
              placeholder="Deixe vazio para usar o cálculo automático"
              className="w-full px-3 py-2 rounded-lg text-xs border bg-surface-secondary border-border-secondary text-text-primary focus:outline-none focus:ring-1 focus:ring-border-hover"
            />
          </div>
          <button
            onClick={saveOverride}
            disabled={savingOverride}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary-btn-bg text-primary-btn-text border-none cursor-pointer hover:opacity-90 disabled:opacity-50"
          >
            {savingOverride ? "Salvando..." : "Salvar Ajuste"}
          </button>
          {payroll.overrideAmount != null && (
            <button
              onClick={clearOverride}
              disabled={savingOverride}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-surface-secondary text-text-secondary border border-border-secondary cursor-pointer hover:text-text-primary"
            >
              Remover Ajuste
            </button>
          )}
        </div>
      </div>

      {/* Tabela completa para o GESTOR */}
      <div className="rounded-xl border border-border-primary overflow-hidden">
        <div className="max-h-[45vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-tertiary">
              <tr>
                <th className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium py-2.5 px-3">Aluno</th>
                <th className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium py-2.5 px-2">Curso</th>
                <th className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium py-2.5 px-2 text-right">Mensalidade</th>
                <th className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium py-2.5 px-2 text-right">Pago</th>
                <th className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium py-2.5 px-2 text-right">Custo Prof.</th>
                <th className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium py-2.5 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {statement.rows.map((r, i) => (
                <tr key={i} className="border-t border-border-primary hover:bg-surface-tertiary/50 transition-colors">
                  <td className="py-2 px-3 text-[11px] font-medium text-text-primary">{r.name}</td>
                  <td className="py-2 px-2 text-[11px] text-text-secondary">{r.instrument}</td>
                  <td className="py-2 px-2 text-[11px] font-mono text-text-secondary text-right">{brl(r.expected)}</td>
                  <td className={cn("py-2 px-2 text-[11px] font-mono text-right font-medium", r.paid > 0 ? "text-accent-green" : "text-text-tertiary")}>
                    {r.paid > 0 ? brl(r.paid) : "—"}
                  </td>
                  <td className="py-2 px-2 text-[11px] font-mono text-accent-red text-right">
                    {brl(r.cost)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full font-semibold",
                      r.status === "PAID" ? "bg-accent-green/10 text-accent-green" :
                      r.status === "WAIVED" ? "bg-surface-tertiary text-text-tertiary" :
                      "bg-accent-amber/10 text-accent-amber"
                    )}>
                      {r.status === "PAID" ? "Pago" : r.status === "WAIVED" ? "Isento" : "Pendente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumo completo para o GESTOR */}
        <div className="border-t border-border-primary bg-surface-tertiary px-3 py-3">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Alunos</p>
              <p className="text-sm font-mono font-bold text-text-primary">{statement.activeCount} <span className="text-[10px] font-normal text-text-tertiary">({statement.paidCount} pag.)</span></p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Previsto</p>
              <p className="text-sm font-mono font-bold text-text-secondary">{brl(statement.totalExpected)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Recebido</p>
              <p className="text-sm font-mono font-bold text-accent-green">{brl(statement.totalPaid)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Folha Prof.</p>
              <p className="text-sm font-mono font-bold text-accent-red">{brl(statement.totalCost)}</p>
              <p className="text-[9px] text-text-tertiary">
                {professor.compensationType === "hourly"
                  ? `${payroll.lessonCount} aulas · ${getProfessorCompensationLabel(professor)}`
                  : `${brl(professor.costPerStudent)}/al. × ${statement.activeCount}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Botão copia versão SIMPLIFICADA para o professor */}
      <button
        onClick={handleCopy}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all border-none cursor-pointer",
          copied
            ? "bg-accent-green/10 text-accent-green"
            : "bg-primary-btn-bg text-primary-btn-text hover:opacity-90"
        )}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copiado para WhatsApp" : "Copiar Extrato (WhatsApp)"}
      </button>
      <p className="text-[10px] text-text-tertiary text-center -mt-2">
        O extrato copiado mostra apenas informações para o professor
      </p>
    </div>
  );
};
