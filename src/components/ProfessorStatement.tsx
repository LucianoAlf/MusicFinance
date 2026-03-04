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
      .filter((s) => s.situation === "Ativo" || (s.payments[month] && s.payments[month]!.status === "PAID"))
      .map((s) => {
        const pm = s.payments[month];
        const paid = pm && pm.status === "PAID" ? pm.amount : 0;
        const expected = s.tuitionAmount || 0;
        const cost = professor.costPerStudent;
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
    const totalCost = activeCount * professor.costPerStudent;
    const paidCount = rows.filter((r) => r.paid > 0).length;

    return { rows, totalExpected, totalPaid, totalCost, paidCount, activeCount };
  }, [professor, month]);

  const whatsappText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`*EXTRATO — ${professor.name}*`);
    lines.push(`${MF[month]} ${year} · ${schoolName}`);
    lines.push("");
    lines.push("```");
    statement.rows.forEach((r) => {
      const status = r.status === "PAID" ? "OK" : r.status === "WAIVED" ? "IS" : "—";
      lines.push(`${r.name.padEnd(20)} ${status}  ${brl(r.paid > 0 ? r.paid : r.expected).padStart(10)}`);
    });
    lines.push("```");
    lines.push("");
    lines.push(`Alunos: *${statement.activeCount}* | Pagantes: *${statement.paidCount}*`);
    lines.push(`Previsto: *${brl(statement.totalExpected)}*`);
    lines.push(`Recebido: *${brl(statement.totalPaid)}*`);
    lines.push(`Sua folha: *${brl(statement.totalCost)}* (${brl(professor.costPerStudent)}/aluno x ${statement.activeCount})`);
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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-tertiary">
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
              <p className="text-[9px] text-text-tertiary">{brl(professor.costPerStudent)}/al. x {statement.activeCount}</p>
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
