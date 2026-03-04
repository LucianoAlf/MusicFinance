import React from "react";
import { useData } from "../context/DataContext";
import { brl, pct, MS, CCN, CCC, cn } from "../lib/utils";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export const Dre = () => {
  const { data, calcMo } = useData();
  if (!data) return null;

  const md = Array.from({ length: 12 }, (_, i) => calcMo(i));
  const mR = md.map((d) => d.revenue);
  const mE = md.map((d) => d.expenses);
  const profit = md.map((d) => d.profit);

  const ccM = (data.expenses || []).map((cc) => {
    const arr = Array(12).fill(0);
    for (let m = 0; m < 12; m++) {
      if (cc.id === "cc1" || cc.name === "Professores") arr[m] += md[m].profPayroll;
      (cc.items || []).forEach((it) => {
        arr[m] += it.amounts?.[m] || 0;
      });
    }
    return { name: cc.name, color: cc.color, amounts: arr };
  });

  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const cd = "rounded-xl p-4 shadow-sm border bg-surface-secondary border-border-primary";
  const cl = "text-right py-2 px-1.5 font-mono text-[11px] text-text-primary";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">
        DRE Anual — {data.config.year}
      </h1>

      <div className={cd}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 px-2 font-sans font-medium text-[10px] uppercase tracking-wider text-text-tertiary w-32 border-b border-border-primary">Conta</th>
                {MS.map((m) => (
                  <th key={m} className="text-right py-2 px-1.5 font-sans font-medium text-[10px] uppercase tracking-wider text-text-tertiary border-b border-border-primary">
                    {m}
                  </th>
                ))}
                <th className="text-right py-2 px-2 font-sans font-medium text-[10px] uppercase tracking-wider text-text-tertiary border-b border-border-primary">Total</th>
                <th className="text-right py-2 px-2 font-sans font-medium text-[10px] uppercase tracking-wider text-text-tertiary border-b border-border-primary">%</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-surface-tertiary transition-colors">
                <td className="py-2.5 px-2 font-bold text-accent-green border-b border-border-primary">RECEITA</td>
                {mR.map((v, i) => (
                  <td key={i} className={cn(cl, "text-accent-green border-b border-border-primary")}>
                    {brl(v)}
                  </td>
                ))}
                <td className={cn(cl, "font-bold text-accent-green border-b border-border-primary")}>{brl(sum(mR))}</td>
                <td className={cn(cl, "text-text-secondary border-b border-border-primary")}>100%</td>
              </tr>
              <tr className="hover:bg-surface-tertiary transition-colors">
                <td className="py-2.5 px-2 font-bold text-accent-red border-b border-border-primary">DESPESAS</td>
                {mE.map((v, i) => (
                  <td key={i} className={cn(cl, "text-accent-red border-b border-border-primary")}>
                    {brl(v)}
                  </td>
                ))}
                <td className={cn(cl, "font-bold text-accent-red border-b border-border-primary")}>{brl(sum(mE))}</td>
                <td className={cn(cl, "text-text-secondary border-b border-border-primary")}>{pct(sum(mE) / (sum(mR) || 1))}</td>
              </tr>
              {ccM.map((cc, ci) => (
                <tr key={ci} className="hover:bg-surface-tertiary transition-colors">
                  <td className="py-2 px-2 pl-4 border-b border-border-secondary">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full opacity-80" style={{ backgroundColor: cc.color }}></div>
                      <span className="text-[11px] text-text-secondary">{cc.name}</span>
                    </div>
                  </td>
                  {cc.amounts.map((v, i) => (
                    <td key={i} className={cn(cl, "text-text-secondary border-b border-border-secondary")}>
                      {brl(v)}
                    </td>
                  ))}
                  <td className={cn(cl, "border-b border-border-secondary")}>{brl(sum(cc.amounts))}</td>
                  <td className={cn(cl, "text-text-secondary border-b border-border-secondary")}>{pct(sum(cc.amounts) / (sum(mR) || 1))}</td>
                </tr>
              ))}
              <tr className="bg-surface-tertiary/50">
                <td className="py-3 px-2 font-bold text-sm text-text-primary">
                  RESULTADO
                </td>
                {profit.map((v, i) => (
                  <td
                    key={i}
                    className={cn(
                      cl,
                      "font-bold",
                      v >= 0 ? "text-accent-green" : "text-accent-red"
                    )}
                  >
                    {brl(v)}
                  </td>
                ))}
                <td
                  className={cn(
                    cl,
                    "font-bold text-sm",
                    sum(profit) >= 0 ? "text-accent-green" : "text-accent-red"
                  )}
                >
                  {brl(sum(profit))}
                </td>
                <td
                  className={cn(
                    cl,
                    "font-bold",
                    sum(profit) >= 0 ? "text-accent-green" : "text-accent-red"
                  )}
                >
                  {pct(sum(profit) / (sum(mR) || 1))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={cd}>
        <h3 className="text-xs font-semibold mb-4 text-text-primary uppercase tracking-wider">
          Resultado Mensal
        </h3>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={md} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-primary)" />
              <XAxis dataKey="month" stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--color-surface-tertiary)", borderColor: "var(--color-border-primary)", borderRadius: "8px", fontSize: "11px", color: "var(--color-text-primary)" }}
                formatter={(value: number) => brl(value)}
              />
              <Bar dataKey="profit" radius={[4, 4, 4, 4]}>
                {md.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? "var(--color-accent-green)" : "var(--color-accent-red)"} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
