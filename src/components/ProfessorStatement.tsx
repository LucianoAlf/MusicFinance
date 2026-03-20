import React, { useMemo } from "react";
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
  const [copied, setCopied] = React.useState(false);

  const statement = useMemo(() => {
    const rows = professor.students
      .filter((s) => s.situation === "Ativo")
      .map((s) => ({
        name: s.name,
        instrument: s.instrumentName || "—",
        cost: professor.costPerStudent,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const activeCount = rows.length;
    const totalCost = activeCount * professor.costPerStudent;

    return { rows, totalCost, activeCount };
  }, [professor, month]);

  const whatsappText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`*EXTRATO — ${professor.name}*`);
    lines.push(`${MF[month]} ${year} · ${schoolName}`);
    lines.push("");
    lines.push("```");
    statement.rows.forEach((r) => {
      lines.push(`${r.name.padEnd(22)} ${r.instrument.padEnd(10)} ${brl(r.cost).padStart(8)}`);
    });
    lines.push("```");
    lines.push("");
    lines.push(`Alunos ativos: *${statement.activeCount}*`);
    lines.push(`Valor por aluno: *${brl(professor.costPerStudent)}*`);
    lines.push(`*TOTAL: ${brl(statement.totalCost)}*`);
    return lines.join("\n");
  }, [professor, month, year, schoolName, statement]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      <div className="rounded-xl border border-border-primary overflow-hidden">
        <div className="max-h-[45vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-tertiary">
              <tr>
                <th className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium py-2.5 px-3">Aluno</th>
                <th className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium py-2.5 px-3">Curso</th>
                <th className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium py-2.5 px-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {statement.rows.map((r, i) => (
                <tr key={i} className="border-t border-border-primary hover:bg-surface-tertiary/50 transition-colors">
                  <td className="py-2.5 px-3 text-[11px] font-medium text-text-primary">{r.name}</td>
                  <td className="py-2.5 px-3 text-[11px] text-text-secondary">{r.instrument}</td>
                  <td className="py-2.5 px-3 text-[11px] font-mono font-medium text-accent-green text-right">
                    {brl(r.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border-primary bg-surface-tertiary px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-text-tertiary">
                {statement.activeCount} alunos × {brl(professor.costPerStudent)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Total</p>
              <p className="text-lg font-mono font-bold text-accent-green">{brl(statement.totalCost)}</p>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
};
