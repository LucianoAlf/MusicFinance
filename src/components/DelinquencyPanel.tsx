import React, { useMemo, useState } from "react";
import type { Professor, Student } from "../types";
import { brl, MS, MF, cn } from "../lib/utils";
import { AlertTriangle, Copy, Check, Phone, ChevronDown, ChevronRight } from "lucide-react";

interface DelinquentStudent {
  student: Student;
  professorName: string;
  lateMonths: number[];
  totalOwed: number;
}

interface Props {
  professors: Professor[];
  currentMonth: number;
  year: number;
}

export const DelinquencyPanel: React.FC<Props> = ({ professors, currentMonth, year }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const delinquents = useMemo(() => {
    const result: DelinquentStudent[] = [];
    const seen = new Set<string>();

    const now = new Date();
    const currentActualMonth = now.getMonth();
    const currentActualDay = now.getDate();
    const currentActualYear = now.getFullYear();

    professors.forEach((p) => {
      p.students.forEach((s) => {
        if (s.situation !== "Ativo") return;
        const key = s.personId || s.id;
        if (seen.has(key)) return;
        seen.add(key);

        const lateMonths: number[] = [];
        let totalOwed = 0;
        const due = s.dueDay ?? 5;

        for (let m = 0; m <= currentMonth; m++) {
          const pm = s.payments[m];
          if (!pm || pm.status === "PENDING") {
            let isLate = false;
            if (year < currentActualYear) {
              isLate = true;
            } else if (year === currentActualYear) {
              if (m < currentActualMonth) {
                isLate = true;
              } else if (m === currentActualMonth) {
                if (currentActualDay > due) {
                  isLate = true;
                }
              }
            }

            if (isLate) {
              lateMonths.push(m);
              totalOwed += s.tuitionAmount || 0;
            }
          }
        }
        if (lateMonths.length > 0) {
          result.push({ student: s, professorName: p.name, lateMonths, totalOwed });
        }
      });
    });

    return result.sort((a, b) => b.lateMonths.length - a.lateMonths.length);
  }, [professors, currentMonth]);

  const totalDelinquent = delinquents.length;
  const totalOwed = delinquents.reduce((s, d) => s + d.totalOwed, 0);

  const copyContact = async (d: DelinquentStudent) => {
    const lines: string[] = [];
    lines.push(`Aluno: ${d.student.name}`);
    lines.push(`Professor: ${d.professorName}`);
    if (d.student.phone) lines.push(`Tel: ${d.student.phone}`);
    if (d.student.responsibleName) lines.push(`Responsável: ${d.student.responsibleName}`);
    if (d.student.responsiblePhone) lines.push(`Tel Resp: ${d.student.responsiblePhone}`);
    lines.push(`Meses em atraso: ${d.lateMonths.map((m) => MS[m]).join(", ")}`);
    lines.push(`Total: ${brl(d.totalOwed)}`);
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(d.student.id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (totalDelinquent === 0) return null;

  return (
    <div className="rounded-xl border border-border-primary bg-surface-secondary overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary bg-surface-tertiary">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-accent-red" />
          <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">Inadimplência</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono text-accent-red font-medium">{totalDelinquent} alunos</span>
          <span className="text-[11px] font-mono text-accent-red font-bold">{brl(totalOwed)}</span>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {delinquents.map((d) => (
          <div key={d.student.id} className="border-b border-border-primary last:border-0">
            <div
              className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-surface-tertiary/50 transition-colors"
              onClick={() => setExpanded(expanded === d.student.id ? null : d.student.id)}
            >
              <div className="flex items-center gap-3">
                <button className="p-0.5 border-none bg-transparent cursor-pointer text-text-tertiary">
                  {expanded === d.student.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <div>
                  <p className="text-[11px] font-medium text-text-primary">{d.student.name}</p>
                  <p className="text-[10px] text-text-tertiary">
                    Prof. {d.professorName} · {d.student.instrumentName || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-[9px] px-2 py-0.5 rounded-full font-semibold",
                  d.lateMonths.length >= 3 ? "bg-accent-red/10 text-accent-red" :
                  d.lateMonths.length >= 2 ? "bg-accent-amber/10 text-accent-amber" :
                  "bg-accent-amber/10 text-accent-amber"
                )}>
                  {d.lateMonths.length} {d.lateMonths.length === 1 ? "mês" : "meses"}
                </span>
                <span className="text-[11px] font-mono font-bold text-accent-red">{brl(d.totalOwed)}</span>
              </div>
            </div>

            {expanded === d.student.id && (
              <div className="px-4 pb-3 pt-1 bg-surface-tertiary/30">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {d.lateMonths.map((m) => (
                    <span key={m} className="text-[9px] px-2 py-0.5 rounded-md bg-accent-red/10 text-accent-red font-mono font-medium">
                      {MS[m]}
                    </span>
                  ))}
                </div>
                {(d.student.phone || d.student.responsibleName || d.student.responsiblePhone) && (
                  <div className="flex items-center gap-3 text-[10px] text-text-secondary mb-2">
                    <Phone size={10} className="text-text-tertiary" />
                    {d.student.phone && <span>{d.student.phone}</span>}
                    {d.student.responsibleName && <span>Resp: {d.student.responsibleName}</span>}
                    {d.student.responsiblePhone && <span>{d.student.responsiblePhone}</span>}
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); copyContact(d); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border-none cursor-pointer",
                    copied === d.student.id
                      ? "bg-accent-green/10 text-accent-green"
                      : "bg-surface-tertiary text-text-secondary hover:text-text-primary"
                  )}
                >
                  {copied === d.student.id ? <Check size={10} /> : <Copy size={10} />}
                  {copied === d.student.id ? "Copiado" : "Copiar dados"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
