import React from "react";
import { useData } from "../context/DataContext";
import { brl, pct, MS, MF, cn } from "../lib/utils";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

export const Dre = () => {
  const { data, calcMo, viewKpis } = useData();
  if (!data) return null;

  const year = data.config.year;
  const md = Array.from({ length: 12 }, (_, i) => {
    const calc = calcMo(i);
    if (!calc) return null;

    // Gross Revenue breakdown
    const tuition = calc.tuition;
    const otherRevenues = (data.revenue || []).map(rc => ({
      id: rc.id,
      name: rc.name,
      amount: rc.amounts?.[i] || 0
    }));
    const grossRevenue = tuition + otherRevenues.reduce((s, r) => s + r.amount, 0);

    // Deductions: Center "Impostos"
    const impostosCenter = data.expenses.find(cc => cc.name === "Impostos");
    const impostos = impostosCenter ? impostosCenter.items.reduce((s, it) => s + (it.amounts?.[i] || 0), 0) : 0;

    const netRevenue = grossRevenue - impostos;

    // Variable Costs
    const folhaProf = viewKpis?.monthly?.[i]?.professorPayroll ?? calc.profPayroll;
    const varExpenses = data.expenses
      .filter(cc => cc.name !== "Impostos")
      .reduce((sum, cc) => {
        return sum + cc.items
          .filter(it => it.type === 'V')
          .reduce((s, it) => s + (it.amounts?.[i] || 0), 0);
      }, 0);
    const totalVariable = varExpenses;

    const contributionMargin = netRevenue - totalVariable;

    // Fixed Expenses grouped by center
    const fixedBreakdown = data.expenses
      .filter(cc => cc.name !== "Impostos")
      .map(cc => {
        const centerItems = cc.items
          .filter(it => it.type === 'F')
          .map(it => ({ name: it.name, amount: it.amounts?.[i] || 0 }));
        const centerTotal = centerItems.reduce((s, it) => s + it.amount, 0);
        return { name: cc.name, total: centerTotal, items: centerItems };
      });
    const totalFixed = fixedBreakdown.reduce((s, cc) => s + cc.total, 0) + folhaProf;

    const result = contributionMargin - totalFixed;

    return {
      month: MS[i],
      fullMonth: MF[i],
      grossRevenue,
      tuition,
      otherRevenues,
      impostos,
      netRevenue,
      folhaProf,
      totalVariable,
      varExpenses,
      contributionMargin,
      fixedBreakdown,
      totalFixed,
      profit: result
    };
  }).filter(Boolean) as any[];

  const sum = (fn: (m: any) => number) => md.reduce((acc, m) => acc + fn(m), 0);

  const totalGross = sum(m => m.grossRevenue);

  const cd = "rounded-xl p-4 shadow-sm border bg-surface-secondary border-border-primary";
  const cellClass = "text-right py-2 px-1.5 font-mono text-[11px] whitespace-nowrap";
  
  const renderRow = (
    label: string, 
    valFn: (m: any) => number, 
    options: { 
      isSubtotal?: boolean; 
      isNegative?: boolean; 
      isMainResult?: boolean;
      indent?: number;
    } = {}
  ) => {
    const total = sum(valFn);
    const percentage = totalGross > 0 ? (total / totalGross) : 0;
    const isNegValue = options.isNegative;

    return (
      <tr className={cn(
        "hover:bg-surface-tertiary/30 transition-colors",
        options.isSubtotal && "bg-surface-tertiary/50 font-semibold border-t border-border-primary"
      )}>
        <td className={cn(
          "py-2 px-3 text-[11px] font-sans border-b border-border-primary/50",
          options.indent === 1 && "pl-6",
          options.indent === 2 && "pl-10",
          options.isSubtotal ? "text-text-primary uppercase tracking-tight" : "text-text-secondary",
          isNegValue && "text-accent-red"
        )}>
          {options.isNegative && "(−) "}{label}
        </td>
        {md.map((m, i) => {
          const val = valFn(m);
          return (
            <td key={i} className={cn(
              cellClass, 
              "border-b border-border-primary/50",
              options.isSubtotal ? "text-text-primary" : "text-text-secondary",
              options.isMainResult ? (val >= 0 ? "text-accent-green" : "text-accent-red") : (isNegValue && val > 0 ? "text-accent-red" : "")
            )}>
              {val === 0 ? "—" : brl(val)}
            </td>
          );
        })}
        <td className={cn(
          cellClass, 
          "font-bold border-b border-border-primary/50",
          options.isMainResult ? (total >= 0 ? "text-accent-green" : "text-accent-red") : (options.isSubtotal ? "text-text-primary" : "text-text-secondary"),
          isNegValue && total > 0 && "text-accent-red"
        )}>
          {brl(total)}
        </td>
        <td className={cn(
          cellClass, 
          "text-text-tertiary font-medium border-b border-border-primary/50",
          options.isMainResult ? (total >= 0 ? "text-accent-green" : "text-accent-red") : ""
        )}>
          {pct(percentage)}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          DRE Anual — {year}
        </h1>
      </div>

      <div className={cd}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th className="text-left py-3 px-3 font-sans font-medium text-[10px] uppercase tracking-wider text-text-tertiary border-b border-border-primary w-48">Conta</th>
                {MS.map((m) => (
                  <th key={m} className="text-right py-3 px-1.5 font-sans font-medium text-[10px] uppercase tracking-wider text-text-tertiary border-b border-border-primary">
                    {m}
                  </th>
                ))}
                <th className="text-right py-3 px-3 font-sans font-medium text-[10px] uppercase tracking-wider text-text-tertiary border-b border-border-primary">Total</th>
                <th className="text-right py-3 px-3 font-sans font-medium text-[10px] uppercase tracking-wider text-text-tertiary border-b border-border-primary">%</th>
              </tr>
            </thead>
            <tbody>
              {renderRow("RECEITA BRUTA", m => m.grossRevenue, { isSubtotal: true })}
              {renderRow("Mensalidades (auto)", m => m.tuition, { indent: 1 })}
              {(data.revenue || []).map(rc => (
                <React.Fragment key={rc.id}>
                  {renderRow(rc.name, m => m.otherRevenues.find((r: any) => r.id === rc.id)?.amount || 0, { indent: 1 })}
                </React.Fragment>
              ))}

              {renderRow("DEDUÇÕES", m => m.impostos, { isSubtotal: true, isNegative: true })}
              {renderRow("Impostos", m => m.impostos, { indent: 1 })}

              {renderRow("RECEITA LÍQUIDA", m => m.netRevenue, { isSubtotal: true })}

              {renderRow("CUSTOS VARIÁVEIS", m => m.totalVariable, { isSubtotal: true, isNegative: true })}
              {/* Extra variable items if any */}
              {(() => {
                const varItems = data.expenses
                  .filter(cc => cc.name !== "Impostos")
                  .flatMap(cc => cc.items.filter(it => it.type === 'V'));
                return varItems.map((it, idx) => (
                  <React.Fragment key={idx}>
                    {renderRow(it.name, m => m.varExpenses, { indent: 1 })}
                  </React.Fragment>
                ));
              })()}

              {renderRow("MARGEM DE CONTRIBUIÇÃO", m => m.contributionMargin, { isSubtotal: true })}

              {renderRow("DESPESAS FIXAS", m => m.totalFixed, { isSubtotal: true, isNegative: true })}
              {renderRow("Folha Professores (auto)", m => m.folhaProf, { indent: 1 })}
              {data.expenses
                .filter(cc => cc.name !== "Impostos")
                .map((cc, ci) => (
                  <React.Fragment key={cc.id}>
                    {renderRow(cc.name, m => m.fixedBreakdown[ci]?.total || 0, { indent: 1 })}
                    {cc.items
                      .filter(it => it.type === 'F')
                      .map((it, ii) => (
                        <React.Fragment key={ii}>
                          {renderRow(it.name, m => m.fixedBreakdown[ci]?.items[ii]?.amount || 0, { indent: 2 })}
                        </React.Fragment>
                      ))}
                  </React.Fragment>
                ))}

              <tr className="h-4"></tr>
              {renderRow("RESULTADO OPERACIONAL", m => m.profit, { isSubtotal: true, isMainResult: true })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={cd}>
        <h3 className="text-xs font-semibold mb-6 text-text-primary uppercase tracking-wider">
          Resultado Mensal (EBITDA)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={md} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-primary)" />
              <XAxis 
                dataKey="month" 
                stroke="var(--color-text-tertiary)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
              />
              <YAxis 
                stroke="var(--color-text-tertiary)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} 
              />
              <Tooltip
                cursor={{ fill: 'var(--color-surface-tertiary)', opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-surface-accent border border-border-primary p-3 rounded-lg shadow-xl text-[11px] space-y-1.5 min-w-[180px]">
                        <p className="font-bold text-text-primary mb-2 border-b border-border-primary pb-1">{d.fullMonth}</p>
                        <div className="flex justify-between gap-4">
                          <span className="text-text-secondary">Receita Líquida:</span>
                          <span className="font-mono text-text-primary">{brl(d.netRevenue)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-text-secondary">Custos Var.:</span>
                          <span className="font-mono text-accent-red">{brl(d.totalVariable)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-text-secondary">Despesas Fixas:</span>
                          <span className="font-mono text-accent-red">{brl(d.totalFixed)}</span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t border-border-primary mt-1">
                          <span className="font-bold text-text-primary">Resultado:</span>
                          <span className={cn("font-mono font-bold", d.profit >= 0 ? "text-accent-green" : "text-accent-red")}>
                            {brl(d.profit)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="var(--color-text-tertiary)" strokeDasharray="3 3" />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {md.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.profit >= 0 ? "var(--color-accent-green)" : "var(--color-accent-red)"} 
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
