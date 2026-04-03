import React, { useMemo, useState } from "react";
import { getProfessorStudentCostAllocation } from "../lib/professorCompensation";
import type { Professor } from "../types";
import { brl, pct, MS, cn } from "../lib/utils";
import { BarChart3, ChevronDown, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";

interface CourseData {
  instrument: string;
  students: number;
  paying: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  ticket: number;
}

interface Props {
  professors: Professor[];
  currentMonth: number;
  year: number;
}

export const CourseBreakdown: React.FC<Props> = ({ professors, currentMonth, year }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"revenue" | "profit" | "margin" | "students">("revenue");

  const courses = useMemo(() => {
    const map = new Map<string, { students: Set<string>; paying: Set<string>; revenue: number; cost: number }>();

    professors.forEach((p) => {
      const costAllocation = getProfessorStudentCostAllocation(p, year, currentMonth);
      p.students.forEach((s) => {
        if (s.situation !== "Ativo") return;
        const inst = s.instrumentName || "Sem curso";
        const key = s.personId || s.id;

        if (!map.has(inst)) map.set(inst, { students: new Set(), paying: new Set(), revenue: 0, cost: 0 });
        const entry = map.get(inst)!;
        entry.students.add(key);

        const pm = s.payments[currentMonth];
        if (pm && pm.status === "PAID" && pm.amount > 0) {
          entry.paying.add(key);
          entry.revenue += pm.amount;
          entry.cost += costAllocation.get(s.id) || 0;
        }
      });
    });

    const result: CourseData[] = [];
    map.forEach((v, instrument) => {
      const revenue = v.revenue;
      const cost = v.cost;
      const profit = revenue - cost;
      const margin = revenue > 0 ? profit / revenue : 0;
      const paying = v.paying.size;
      result.push({
        instrument,
        students: v.students.size,
        paying,
        revenue,
        cost,
        profit,
        margin,
        ticket: paying > 0 ? revenue / paying : 0,
      });
    });

    return result.sort((a, b) => b[sortBy] - a[sortBy]);
  }, [professors, currentMonth, sortBy, year]);

  const totalRevenue = courses.reduce((s, c) => s + c.revenue, 0);
  const totalCost = courses.reduce((s, c) => s + c.cost, 0);
  const totalProfit = totalRevenue - totalCost;

  if (courses.length === 0) {
    return (
      <div className="rounded-xl p-6 border border-border-primary bg-surface-secondary text-center">
        <p className="text-sm font-medium text-text-secondary">Nenhum dado de curso disponível</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...courses.map((c) => c.revenue));

  return (
    <div className="rounded-xl border border-border-primary bg-surface-secondary overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary bg-surface-tertiary">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-text-tertiary" />
          <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Rentabilidade por Curso — {MS[currentMonth]}
          </span>
        </div>
        {courses.length > 1 && (
          <div className="flex items-center gap-1 bg-surface-secondary p-0.5 rounded-lg border border-border-secondary">
            {(["revenue", "profit", "margin", "students"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={cn(
                  "px-2.5 py-1 text-[9px] rounded-md border-none cursor-pointer transition-colors font-medium",
                  sortBy === key
                    ? "bg-surface-tertiary text-text-primary shadow-sm"
                    : "bg-transparent text-text-tertiary hover:text-text-secondary"
                )}
              >
                {{ revenue: "Receita", profit: "Lucro", margin: "Margem", students: "Alunos" }[key]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="divide-y divide-border-primary">
        {courses.map((c) => (
          <div key={c.instrument}>
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-tertiary/50 transition-colors"
              onClick={() => setExpanded(expanded === c.instrument ? null : c.instrument)}
            >
              <button className="p-0.5 border-none bg-transparent cursor-pointer text-text-tertiary shrink-0">
                {expanded === c.instrument ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-text-primary">{c.instrument}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-text-tertiary">{c.students} al. · {c.paying} pag.</span>
                    <span className="text-[11px] font-mono font-bold text-accent-green">{brl(c.revenue)}</span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-green/60 transition-all duration-300"
                    style={{ width: `${maxRevenue > 0 ? (c.revenue / maxRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {expanded === c.instrument && (
              <div className="px-4 pb-3 pt-1 bg-surface-tertiary/30 ml-8">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Receita</p>
                    <p className="text-sm font-mono font-bold text-accent-green">{brl(c.revenue)}</p>
                    {totalRevenue > 0 && (
                      <p className="text-[9px] text-text-tertiary">{((c.revenue / totalRevenue) * 100).toFixed(0)}% do total</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Custo Prof.</p>
                    <p className="text-sm font-mono font-bold text-accent-red">{brl(c.cost)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Lucro</p>
                    <p className={cn("text-sm font-mono font-bold flex items-center gap-1", c.profit >= 0 ? "text-accent-green" : "text-accent-red")}>
                      {c.profit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {brl(c.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Margem</p>
                    <p className={cn("text-sm font-mono font-bold", c.margin >= 0.3 ? "text-accent-green" : c.margin >= 0 ? "text-accent-amber" : "text-accent-red")}>
                      {pct(c.margin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Ticket Médio</p>
                    <p className="text-sm font-mono font-bold text-text-primary">{brl(c.ticket)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border-primary bg-surface-tertiary px-4 py-3">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Receita Total</p>
            <p className="text-sm font-mono font-bold text-accent-green">{brl(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Custo Prof. Total</p>
            <p className="text-sm font-mono font-bold text-accent-red">{brl(totalCost)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-text-tertiary mb-0.5">Lucro Bruto</p>
            <p className={cn("text-sm font-mono font-bold", totalProfit >= 0 ? "text-accent-green" : "text-accent-red")}>{brl(totalProfit)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
