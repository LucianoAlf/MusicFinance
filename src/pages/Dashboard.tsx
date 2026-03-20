import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { MonthSelector } from "../components/MonthSelector";
import { KpiCard } from "../components/KpiCard";
import { DelinquencyPanel } from "../components/DelinquencyPanel";
import { CourseBreakdown } from "../components/CourseBreakdown";
import { brl, pct, MS, MF, cn } from "../lib/utils";
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
  Calendar,
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
  ReferenceLine,
} from "recharts";

export const Dashboard = () => {
  const { data, calcMo, curMo, setCurMo, viewKpis } = useData();
  const [chartsReady, setChartsReady] = useState(false);

  // Aguardar o DOM estar pronto antes de renderizar os gráficos
  // Evita erro "insertBefore" do Recharts em containers com dimensão 0
  useEffect(() => {
    const timer = setTimeout(() => setChartsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!data) return null;

  const md = Array.from({ length: 12 }, (_, i) => calcMo(i));
  const tR = md.reduce((a, d) => a + d.revenue, 0);
  const tE = md.reduce((a, d) => a + d.expenses, 0);
  const tProfit = tR - tE;
  const tMargin = tR > 0 ? tProfit / tR : 0;

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

  const delinquentCount = (() => {
    const seen = new Set<string>();
    let count = 0;
    const now = new Date();
    const currentActualMonth = now.getMonth();
    const currentActualDay = now.getDate();
    const currentActualYear = now.getFullYear();
    const selectedYear = data.config.year;

    data.professors.forEach((p) => {
      p.students.forEach((s) => {
        if (s.situation !== "Ativo") return;
        const key = s.personId || s.id;
        if (seen.has(key)) return;
        seen.add(key);
        
        const due = s.dueDay ?? 5;
        let isDelinquent = false;

        for (let m = 0; m <= curMo; m++) {
          const pm = s.payments[m];
          if (!pm || pm.status === "PENDING") {
            if (selectedYear < currentActualYear) {
              isDelinquent = true; break;
            } else if (selectedYear === currentActualYear) {
              if (m < currentActualMonth) {
                isDelinquent = true; break;
              } else if (m === currentActualMonth) {
                if (currentActualDay > due) {
                  isDelinquent = true; break;
                }
              }
            }
          }
        }
        if (isDelinquent) count++;
      });
    });
    return count;
  })();
  
  // Cálculo do Ponto de Equilíbrio em Alunos
  // PE (Alunos) = Despesas Fixas / (Ticket Médio - Custo Var por Aluno)
  const marginPerStudent = cur.ticket - cur.costPerStudent;
  const beAlunos = marginPerStudent > 0 ? Math.ceil(cur.fixedCost / marginPerStudent) : null;

  const ccT = (data.expenses || []).map((cc) => {
    let t = 0;
    if (cc.id === "cc1" || cc.name === "Professores") {
      t += cur.profPayroll;
    }
    (cc.items || []).forEach((it) => { t += (it.amounts?.[curMo] || 0) });
    return { name: cc.name, total: t, fill: cc.color };
  });

  const pieData = ccT.filter((x) => x.total > 0);

  return (
    <div className="space-y-6">
      {/* Header com seletor de meses */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border-primary pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Dashboard</h1>
          <p className="text-xs mt-1 text-text-secondary">
            {data.config.schoolName} — {data.config.year}
          </p>
        </div>
        <MonthSelector curMo={curMo} setCurMo={setCurMo} />
      </div>

      {/* Seção FINANCEIRO — Mês Selecionado */}
      <div>
        <p className="text-[10px] font-semibold mb-3 uppercase tracking-wider text-text-secondary">
          Financeiro — {MF[curMo]}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KpiCard label="Receita" value={brl(cur.revenue)} trend={trend(cur.revenue, prev?.revenue)} />
          <KpiCard label="Previsto" value={brl(cur.expectedRevenue)} sub={cur.expectedRevenue > 0 ? `Realizado: ${pct(cur.revenue / cur.expectedRevenue)}` : undefined} />
          <KpiCard label="Despesas" value={brl(cur.expenses)} trend={trend(cur.expenses, prev?.expenses)} invertTrend />
          <KpiCard label="Resultado" value={brl(cur.profit)} trend={trend(cur.profit, prev?.profit)} />
          <KpiCard label="Ticket Médio" value={brl(cur.ticket)} sub={`Custo ${brl(cur.costPerStudent)}`} />
          <KpiCard label="Ponto de Equilíbrio" value={beAlunos != null ? `${beAlunos} alunos` : "—"} sub={beAlunos != null ? `Margem/al: ${brl(marginPerStudent)}` : undefined} />
        </div>
      </div>

      <div className="border-b border-border-primary"></div>

      {/* Seção ALUNOS — Mês Selecionado */}
      <div>
        <p className="text-[10px] font-semibold mb-3 uppercase tracking-wider text-text-secondary">
          Alunos — {MF[curMo]}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <KpiCard label="Ativos" value={activeStudents} />
          <KpiCard label="Pagantes" value={cur.payingStudents} sub={`${data.professors.length} profs`} />
          <KpiCard label="Inadimplentes" value={delinquentCount} sub={delinquentCount > 0 && activeStudents > 0 ? `${((delinquentCount / activeStudents) * 100).toFixed(0)}% da base` : undefined} />
          <KpiCard label="Matrículas" value={newEnrollments} trend={trend(newEnrollments, kpiPrev?.newEnrollments ?? null)} />
          <KpiCard label="Evasões" value={churnedStudents} trend={trend(churnedStudents, kpiPrev?.churnedStudents ?? null)} invertTrend />
          <KpiCard label="Churn Rate" value={churnRate.toFixed(1) + "%"} trend={trend(churnRate, kpiPrev?.churnRate ?? null)} invertTrend />
          <KpiCard label="Permanência" value={avgTenure.toFixed(1) + " m"} />
        </div>
      </div>

      {/* Inadimplência + Rentabilidade por Curso */}
      {delinquentCount > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DelinquencyPanel professors={data.professors} currentMonth={curMo} year={data.config.year} />
          <CourseBreakdown professors={data.professors} currentMonth={curMo} />
        </div>
      ) : (
        <CourseBreakdown professors={data.professors} currentMonth={curMo} />
      )}

      {/* Gráficos - só renderiza após DOM estar pronto */}
      {chartsReady && (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl p-4 bg-surface-secondary border border-border-primary">
          <h3 className="text-xs font-semibold mb-4 text-text-primary uppercase tracking-wider">
            Receita × Despesa × Resultado
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <LineChart data={md} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-primary)" />
                <XAxis dataKey="month" stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--color-surface-tertiary)", borderColor: "var(--color-border-primary)", borderRadius: "8px", fontSize: "11px", color: "var(--color-text-primary)" }}
                  itemStyle={{ color: "var(--color-text-primary)" }}
                  labelStyle={{ color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: "4px" }}
                  formatter={(value: number) => brl(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", color: "var(--color-text-secondary)" }} />
                <ReferenceLine x={MS[curMo]} stroke="var(--color-text-tertiary)" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="expectedRevenue" name="Previsto" stroke="var(--color-text-tertiary)" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="revenue" name="Receita" stroke="var(--color-accent-green)" strokeWidth={2} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="expenses" name="Despesas" stroke="var(--color-accent-red)" strokeWidth={2} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="profit" name="Resultado" stroke="var(--color-accent-blue)" strokeWidth={2} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl p-4 bg-surface-secondary border border-border-primary">
          <h3 className="text-xs font-semibold mb-4 text-text-primary uppercase tracking-wider">
            Centros de Custo
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={2} dataKey="total">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="var(--color-surface-secondary)" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--color-surface-tertiary)", borderColor: "var(--color-border-primary)", borderRadius: "8px", fontSize: "11px", color: "var(--color-text-primary)" }}
                  itemStyle={{ color: "var(--color-text-primary)" }}
                  labelStyle={{ color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: "4px" }}
                  formatter={(value: number) => brl(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", color: "var(--color-text-secondary)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-4 bg-surface-secondary border border-border-primary">
          <h3 className="text-xs font-semibold mb-4 text-text-primary uppercase tracking-wider">
            Margem Mensal
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <RechartsBarChart data={md} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-primary)" />
                <XAxis dataKey="month" stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => pct(v)} />
                <Tooltip
                  cursor={{ fill: "var(--color-surface-tertiary)", opacity: 0.4 }}
                  contentStyle={{ backgroundColor: "var(--color-surface-tertiary)", borderColor: "var(--color-border-primary)", borderRadius: "8px", fontSize: "11px", color: "var(--color-text-primary)" }}
                  itemStyle={{ color: "var(--color-text-primary)" }}
                  labelStyle={{ color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: "4px" }}
                  formatter={(value: number) => pct(value)}
                />
                <Bar dataKey="margin" name="Margem" radius={[4, 4, 4, 4]}>
                  {md.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.margin >= 0 ? "var(--color-accent-green)" : "var(--color-accent-red)"}
                      stroke={index === curMo ? "var(--color-text-primary)" : "transparent"}
                      strokeWidth={index === curMo ? 1 : 0}
                    />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl p-4 bg-surface-secondary border border-border-primary">
          <h3 className="text-xs font-semibold mb-4 text-text-primary uppercase tracking-wider">
            Fixos vs Variáveis
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <RechartsBarChart data={md} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-primary)" />
                <XAxis dataKey="month" stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  cursor={{ fill: "var(--color-surface-tertiary)", opacity: 0.4 }}
                  contentStyle={{ backgroundColor: "var(--color-surface-tertiary)", borderColor: "var(--color-border-primary)", borderRadius: "8px", fontSize: "11px", color: "var(--color-text-primary)" }}
                  itemStyle={{ color: "var(--color-text-primary)" }}
                  labelStyle={{ color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: "4px" }}
                  formatter={(value: number) => brl(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", color: "var(--color-text-secondary)" }} />
                <Bar dataKey="fixedCost" name="Fixo" stackId="a" fill="var(--color-accent-blue)" />
                <Bar dataKey="varCost" name="Variável" stackId="a" fill="var(--color-accent-amber)" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Tabela de Indicadores Mensais */}
      <div className="rounded-xl p-4 bg-surface-secondary border border-border-primary">
        <h3 className="text-xs font-semibold mb-4 text-text-primary uppercase tracking-wider">
          Indicadores Mensais
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead>
              <tr>
                <th className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary pb-2 border-b border-border-primary font-medium">Indicador</th>
                {MS.map((m, i) => (
                  <th
                    key={m}
                    className={cn(
                      "font-sans text-[10px] uppercase tracking-wider text-center pb-2 border-b border-border-primary font-medium",
                      i === curMo ? "text-text-primary" : "text-text-tertiary"
                    )}
                  >
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { l: "Previsto", k: "expectedRevenue", f: brl },
                { l: "Receita", k: "revenue", f: brl },
                { l: "Despesas", k: "expenses", f: brl },
                { l: "Resultado", k: "profit", f: brl },
                { l: "Margem", k: "margin", f: pct },
                { l: "Pagantes", k: "payingStudents", f: (v: any) => v },
                { l: "Ticket", k: "ticket", f: brl },
              ].map((r) => (
                <tr key={r.l} className="hover:bg-surface-tertiary transition-colors group">
                  <td className="py-2.5 px-2 font-medium text-text-secondary border-b border-border-primary group-last:border-0">{r.l}</td>
                  {md.map((d, i) => (
                    <td
                      key={i}
                      className={cn(
                        "py-2.5 px-1 text-center font-mono border-b border-border-primary group-last:border-0",
                        i === curMo ? "text-text-primary font-medium bg-surface-tertiary/50" : "text-text-secondary"
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
