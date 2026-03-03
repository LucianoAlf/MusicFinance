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
  const { data, calcMo, dark } = useData();
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
  const cd = cn(
    "rounded-2xl p-5 shadow-sm border",
    dark ? "bg-slate-800/80 border-slate-700/50" : "bg-white border-slate-100"
  );
  const cl = "text-right py-1.5 px-1.5 text-[11px]";

  const tc = dark ? "#94a3b8" : "#64748b";
  const gc = dark ? "#334155" : "#e2e8f0";

  return (
    <div className="space-y-4">
      <h1 className={cn("text-2xl font-bold", dark ? "text-white" : "text-slate-900")}>
        DRE Anual — {data.config.year}
      </h1>

      <div className={cd}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className={cn(dark ? "text-slate-400" : "text-slate-500")}>
                <th className="text-left py-2 px-2 font-semibold w-32">Conta</th>
                {MS.map((m) => (
                  <th key={m} className="text-right py-2 px-1.5 font-semibold">
                    {m}
                  </th>
                ))}
                <th className="text-right py-2 px-2 font-bold">Total</th>
                <th className="text-right py-2 px-2">%</th>
              </tr>
            </thead>
            <tbody>
              <tr className={cn(dark ? "bg-emerald-900/20" : "bg-emerald-50")}>
                <td className={cn("py-2 px-2 font-bold", dark ? "text-emerald-400" : "text-emerald-700")}>RECEITA</td>
                {mR.map((v, i) => (
                  <td key={i} className={cn(cl, dark ? "text-emerald-400" : "text-emerald-700")}>
                    {brl(v)}
                  </td>
                ))}
                <td className={cn(cl, "font-bold", dark ? "text-emerald-400" : "text-emerald-700")}>{brl(sum(mR))}</td>
                <td className={cl}>100%</td>
              </tr>
              <tr className="h-1">
                <td colSpan={15}></td>
              </tr>
              <tr className={cn(dark ? "bg-slate-700/40" : "bg-slate-100")}>
                <td className={cn("py-2 px-2 font-bold", dark ? "text-slate-200" : "text-slate-800")}>DESPESAS</td>
                {mE.map((v, i) => (
                  <td key={i} className={cn(cl, dark ? "text-rose-400" : "text-rose-600")}>
                    {brl(v)}
                  </td>
                ))}
                <td className={cn(cl, "font-bold", dark ? "text-rose-400" : "text-rose-600")}>{brl(sum(mE))}</td>
                <td className={cn(cl, dark ? "text-rose-400" : "text-rose-600")}>{pct(sum(mE) / (sum(mR) || 1))}</td>
              </tr>
              {ccM.map((cc, ci) => (
                <tr key={ci} className={cn("border-t", dark ? "border-slate-700/20" : "border-slate-50")}>
                  <td className="py-1 px-2 pl-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cc.color }}></div>
                      <span className={cn(dark ? "text-slate-400" : "text-slate-500")}>{cc.name}</span>
                    </div>
                  </td>
                  {cc.amounts.map((v, i) => (
                    <td key={i} className={cn(cl, dark ? "text-slate-400" : "text-slate-500")}>
                      {brl(v)}
                    </td>
                  ))}
                  <td className={cl}>{brl(sum(cc.amounts))}</td>
                  <td className={cl}>{pct(sum(cc.amounts) / (sum(mR) || 1))}</td>
                </tr>
              ))}
              <tr className="h-1">
                <td colSpan={15}></td>
              </tr>
              <tr className={cn(dark ? "bg-violet-900/20" : "bg-violet-50")}>
                <td className={cn("py-2.5 px-2 font-bold text-sm", dark ? "text-violet-300" : "text-violet-800")}>
                  RESULTADO
                </td>
                {profit.map((v, i) => (
                  <td
                    key={i}
                    className={cn(
                      cl,
                      "font-bold",
                      v >= 0 ? (dark ? "text-emerald-400" : "text-emerald-600") : "text-rose-500"
                    )}
                  >
                    {brl(v)}
                  </td>
                ))}
                <td
                  className={cn(
                    cl,
                    "font-bold text-sm",
                    sum(profit) >= 0 ? (dark ? "text-emerald-400" : "text-emerald-700") : "text-rose-500"
                  )}
                >
                  {brl(sum(profit))}
                </td>
                <td
                  className={cn(
                    cl,
                    "font-bold",
                    sum(profit) >= 0 ? (dark ? "text-emerald-400" : "text-emerald-700") : "text-rose-500"
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
        <h3 className={cn("text-xs font-semibold mb-3", dark ? "text-slate-300" : "text-slate-700")}>
          Resultado Mensal
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={md} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gc} />
              <XAxis dataKey="month" stroke={tc} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke={tc} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: dark ? "#1e293b" : "#fff", borderColor: gc, borderRadius: "8px", fontSize: "11px" }}
                formatter={(value: number) => brl(value)}
              />
              <Bar dataKey="profit" radius={[6, 6, 6, 6]}>
                {md.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? "rgba(16,185,129,0.7)" : "rgba(239,68,68,0.7)"} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
