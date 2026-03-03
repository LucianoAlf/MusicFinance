import React from "react";
import { useData } from "../context/DataContext";
import { KpiCard } from "../components/KpiCard";
import { brl, pct, MS, cn } from "../lib/utils";
import {
  DollarSign,
  Wallet,
  PiggyBank,
  Target,
  GraduationCap,
  BarChart,
  UserPlus,
  UserMinus,
  TrendingDown,
  Clock,
  Crosshair,
  Users,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  Legend,
} from "recharts";

export const Dashboard = () => {
  const { data, calcMo, curMo, dark, viewKpis } = useData();
  if (!data) return null;

  const md = Array.from({ length: 12 }, (_, i) => calcMo(i));
  const tR = md.reduce((a, d) => a + d.revenue, 0);
  const tE = md.reduce((a, d) => a + d.expenses, 0);

  const cur = md[curMo];
  const prev = curMo > 0 ? md[curMo - 1] : null;

  const trend = (curVal: number, prevVal: number | null | undefined) => {
    if (prevVal == null || prevVal === 0) return null;
    return ((curVal - prevVal) / Math.abs(prevVal)) * 100;
  };

  const kpiMes = viewKpis?.monthly?.find((k) => k.month === curMo + 1);
  const kpiPrev = viewKpis?.monthly?.find((k) => k.month === curMo);
  const beMes = viewKpis?.breakeven?.find((b) => b.month === curMo + 1);

  const newEnrollments = kpiMes?.newEnrollments ?? 0;
  const churnedStudents = kpiMes?.churnedStudents ?? 0;
  const churnRate = kpiMes?.churnRate ?? 0;
  const activeStudents = kpiMes?.activeStudents ?? 0;
  const avgTenure = viewKpis?.avgTenureMonths ?? 0;
  const breakevenRevenue = beMes?.breakevenRevenue;

  const avgM = tR > 0 ? (tR - tE) / tR : 0;

  const ccT = (data.expenses || []).map((cc) => {
    let t = 0;
    if (cc.id === "cc1" || cc.name === "Professores") {
      md.forEach((d) => (t += d.profPayroll));
    }
    (cc.items || []).forEach((it) => (it.amounts || []).forEach((a) => (t += a || 0)));
    return { name: cc.name, total: t, fill: cc.color };
  });

  const pieData = ccT.filter((x) => x.total > 0);

  const cd = cn(
    "rounded-2xl p-5 shadow-sm border",
    dark ? "bg-slate-800/80 border-slate-700/50" : "bg-white border-slate-100"
  );
  const tc = dark ? "#94a3b8" : "#64748b";
  const gc = dark ? "#334155" : "#e2e8f0";

  return (
    <div className="space-y-5">
      <div>
        <h1 className={cn("text-2xl font-bold", dark ? "text-white" : "text-slate-900")}>Dashboard</h1>
        <p className={cn("text-xs mt-1", dark ? "text-slate-400" : "text-slate-500")}>
          {data.config.schoolName} — {data.config.year}
        </p>
      </div>

      <div>
        <p className={cn("text-[10px] font-semibold mb-2 uppercase tracking-wider", dark ? "text-slate-500" : "text-slate-400")}>
          Financeiro
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={DollarSign} label="Receita Anual" value={brl(tR)} color="green" trend={trend(cur.revenue, prev?.revenue)} />
          <KpiCard icon={Wallet} label="Despesas" value={brl(tE)} color="red" />
          <KpiCard icon={PiggyBank} label="Lucro" value={brl(tR - tE)} color={tR - tE >= 0 ? "green" : "red"} trend={trend(cur.profit, prev?.profit)} />
          <KpiCard icon={Target} label="Margem" value={pct(avgM)} color="purple" />
          <KpiCard icon={BarChart} label="Ticket" value={brl(cur.ticket)} color="teal" sub={`Custo ${brl(cur.costPerStudent)}`} />
          <KpiCard icon={Crosshair} label="Ponto Equil." value={breakevenRevenue != null ? brl(breakevenRevenue) : "—"} color="orange" />
        </div>
      </div>

      <div>
        <p className={cn("text-[10px] font-semibold mb-2 uppercase tracking-wider", dark ? "text-slate-500" : "text-slate-400")}>
          Alunos — {MS[curMo]}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={Users} label="Ativos" value={activeStudents} color="blue" />
          <KpiCard icon={GraduationCap} label="Pagantes" value={cur.payingStudents} color="green" sub={`${data.professors.length} profs`} />
          <KpiCard icon={UserPlus} label="Matrículas" value={newEnrollments} color="teal" trend={trend(newEnrollments, kpiPrev?.newEnrollments ?? null)} />
          <KpiCard icon={UserMinus} label="Evasões" value={churnedStudents} color="red" trend={trend(churnedStudents, kpiPrev?.churnedStudents ?? null)} invertTrend />
          <KpiCard icon={TrendingDown} label="Churn Rate" value={churnRate.toFixed(1) + "%"} color="rose" trend={trend(churnRate, kpiPrev?.churnRate ?? null)} invertTrend />
          <KpiCard icon={Clock} label="Permanência" value={avgTenure.toFixed(1) + " m"} color="cyan" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={cn("lg:col-span-2", cd)}>
          <h3 className={cn("text-xs font-semibold mb-3", dark ? "text-slate-300" : "text-slate-700")}>
            Receita × Despesa × Resultado
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={md} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gc} />
                <XAxis dataKey="month" stroke={tc} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={tc} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: dark ? "#1e293b" : "#fff", borderColor: gc, borderRadius: "8px", fontSize: "11px" }}
                  formatter={(value: number) => brl(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="revenue" name="Receita" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="expenses" name="Despesa" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="profit" name="Resultado" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cd}>
          <h3 className={cn("text-xs font-semibold mb-3", dark ? "text-slate-300" : "text-slate-700")}>
            Centros de Custo
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={2} dataKey="total">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: dark ? "#1e293b" : "#fff", borderColor: gc, borderRadius: "8px", fontSize: "11px" }}
                  formatter={(value: number) => brl(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={cd}>
          <h3 className={cn("text-xs font-semibold mb-3", dark ? "text-slate-300" : "text-slate-700")}>
            Margem Mensal
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={md} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gc} />
                <XAxis dataKey="month" stroke={tc} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={tc} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => pct(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: dark ? "#1e293b" : "#fff", borderColor: gc, borderRadius: "8px", fontSize: "11px" }}
                  formatter={(value: number) => pct(value)}
                />
                <Bar dataKey="margin" radius={[4, 4, 4, 4]}>
                  {md.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.margin >= 0 ? "rgba(16,185,129,0.7)" : "rgba(239,68,68,0.7)"} />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cd}>
          <h3 className={cn("text-xs font-semibold mb-3", dark ? "text-slate-300" : "text-slate-700")}>
            Fixos vs Variáveis
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={md} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gc} />
                <XAxis dataKey="month" stroke={tc} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={tc} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: dark ? "#1e293b" : "#fff", borderColor: gc, borderRadius: "8px", fontSize: "11px" }}
                  formatter={(value: number) => brl(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="fixedCost" name="Fixo" stackId="a" fill="rgba(99,102,241,0.7)" />
                <Bar dataKey="varCost" name="Variável" stackId="a" fill="rgba(245,158,11,0.7)" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={cd}>
        <h3 className={cn("text-xs font-semibold mb-3", dark ? "text-slate-300" : "text-slate-700")}>
          Indicadores Mensais
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className={cn(dark ? "text-slate-400" : "text-slate-500")}>
                <th className="text-left py-1.5 px-2 font-medium">Indicador</th>
                {MS.map((m) => (
                  <th key={m} className="text-center py-1.5 px-1 font-medium">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { l: "Receita", k: "revenue", f: brl },
                { l: "Despesas", k: "expenses", f: brl },
                { l: "Resultado", k: "profit", f: brl },
                { l: "Margem", k: "margin", f: pct },
                { l: "Pagantes", k: "payingStudents", f: (v: any) => v },
                { l: "Ticket", k: "ticket", f: brl },
              ].map((r) => (
                <tr key={r.l} className={cn("border-t", dark ? "border-slate-700/30" : "border-slate-100")}>
                  <td className={cn("py-1.5 px-2 font-medium", dark ? "text-slate-300" : "text-slate-700")}>{r.l}</td>
                  {md.map((d, i) => (
                    <td
                      key={i}
                      className={cn(
                        "text-center py-1.5 px-1",
                        r.k === "profit" && d[r.k as keyof typeof d] < 0
                          ? "text-rose-500 font-semibold"
                          : dark
                          ? "text-slate-300"
                          : "text-slate-600"
                      )}
                    >
                      {r.f(d[r.k as keyof typeof d])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
