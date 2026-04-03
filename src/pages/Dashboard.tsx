import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import { MonthSelector } from "../components/MonthSelector";
import { KpiCard } from "../components/KpiCard";
import { DelinquencyPanel } from "../components/DelinquencyPanel";
import { CourseBreakdown } from "../components/CourseBreakdown";
import { brl, pct, MS, MF, cn } from "../lib/utils";
import { getDelinquencySummary } from "../lib/delinquency";
import { getCashProjection30Days } from "../lib/dashboardMetrics";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Wallet,
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
  const { data, calcMo, curMo, setCurMo, setPage, setSelProf, setSelPay, setSelBill, viewKpis } = useData();
  const [chartsReady, setChartsReady] = useState(false);
  const [expandedPriority, setExpandedPriority] = useState<string | null>(null);

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

  const comparisonNote = (
    currentValue: number,
    previousValue: number | null | undefined,
    formatter: (value: number) => string
  ) => {
    if (previousValue == null) return undefined;
    const delta = currentValue - previousValue;
    if (delta === 0) return `vs ${MF[curMo - 1] ?? "mês anterior"}: sem variação`;
    const signal = delta > 0 ? "+" : delta < 0 ? "-" : "";
    return `vs ${MF[curMo - 1] ?? "mês anterior"}: ${signal}${formatter(Math.abs(delta))}`;
  };

  const kpiMes = viewKpis?.monthly?.find((k) => k.month === curMo + 1);
  const kpiPrev = viewKpis?.monthly?.find((k) => k.month === curMo);
  const newEnrollments = kpiMes?.newEnrollments ?? 0;
  const churnedStudents = kpiMes?.churnedStudents ?? 0;
  const churnRate = kpiMes?.churnRate ?? 0;
  const activeStudents = cur.activeStudents;
  const avgTenure = viewKpis?.avgTenureMonths ?? 0;

  const delinquencySummary = useMemo(() => getDelinquencySummary({
    professors: data.professors,
    currentMonth: curMo,
    year: data.config.year,
  }), [data.professors, curMo, data.config.year]);
  const delinquentCount = delinquencySummary.totalDelinquent;
  const cashProjection = useMemo(() => getCashProjection30Days(data, curMo), [data, curMo]);
  
  // Cálculo do Ponto de Equilíbrio em Alunos
  // Regra acordada: despesas totais do mês / ticket médio do mês.
  const breakEvenStudents = cur.ticket > 0 ? cur.expenses / cur.ticket : null;
  const breakEvenStudentsRounded = breakEvenStudents != null ? Math.ceil(breakEvenStudents) : null;
  const activeAlertCount = [
    cashProjection.overdueOutgoingCount > 0,
    delinquencySummary.totalOwed > 0,
    breakEvenStudentsRounded != null && cur.payingStudents < breakEvenStudentsRounded,
  ].filter(Boolean).length;
  const overdueBills = data.payableBills
    .filter((bill) => bill.status === "PENDING" && new Date(bill.dueDate + "T12:00:00") < cashProjection.anchorDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const priorityAlerts = [
    cashProjection.overdueOutgoingCount > 0
      ? {
          id: "overdue-bills",
          tone: "warning" as const,
          title: `${cashProjection.overdueOutgoingCount} conta(s) vencida(s) em aberto`,
          detail: `Contas a pagar já vencidas somam ${brl(cashProjection.overdueOutgoing)}.`,
          expandable: true,
        }
      : null,
    delinquencySummary.totalOwed > 0
      ? {
          id: "delinquency",
          tone: "warning" as const,
          title: `${delinquencySummary.totalDelinquent} aluno(s) com atraso acumulado`,
          detail: `A inadimplência acumulada está em ${brl(delinquencySummary.totalOwed)}.`,
          expandable: true,
        }
      : null,
    breakEvenStudentsRounded != null && cur.payingStudents < breakEvenStudentsRounded
      ? {
          id: "breakeven-gap",
          tone: "info" as const,
          title: "Mês abaixo do ponto de equilíbrio",
          detail: `Faltam ${breakEvenStudentsRounded - cur.payingStudents} aluno(s) pagantes para atingir o equilíbrio do mês.`,
          expandable: false,
        }
      : null,
  ].filter(Boolean) as Array<{ id: string; tone: "warning" | "info"; title: string; detail: string; expandable: boolean }>;

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
          <KpiCard
            label="Receita"
            value={brl(cur.revenue)}
            trend={trend(cur.revenue, prev?.revenue)}
            note={comparisonNote(cur.revenue, prev?.revenue, brl)}
          />
          <KpiCard
            label="Previsto"
            value={brl(cur.expectedRevenue)}
            sub={cur.expectedRevenue > 0 ? `Realizado: ${pct(cur.revenue / cur.expectedRevenue)}` : undefined}
            note={comparisonNote(cur.expectedRevenue, prev?.expectedRevenue, brl)}
          />
          <KpiCard
            label="Despesas"
            value={brl(cur.expenses)}
            trend={trend(cur.expenses, prev?.expenses)}
            invertTrend
            note={comparisonNote(cur.expenses, prev?.expenses, brl)}
          />
          <KpiCard
            label="Resultado"
            value={brl(cur.profit)}
            trend={trend(cur.profit, prev?.profit)}
            note={comparisonNote(cur.profit, prev?.profit, brl)}
          />
          <KpiCard
            label="Ticket Médio"
            value={brl(cur.ticket)}
            note={comparisonNote(cur.ticket, prev?.ticket, brl)}
          />
          <KpiCard
            label="Ponto de Equilíbrio"
            value={breakEvenStudentsRounded != null ? `${breakEvenStudentsRounded} alunos` : "—"}
            sub={breakEvenStudents != null ? `Custo/aluno ${brl(cur.costPerStudent)}` : undefined}
          />
        </div>
      </div>

      <div className="rounded-xl p-4 bg-surface-secondary border border-border-primary">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={14} className="text-accent-blue" />
          <div>
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Pr&oacute;ximos 30 Dias
            </h3>
            <p className="text-[11px] mt-1 text-text-secondary">
              Previs&atilde;o de recebimentos e pagamentos entre {cashProjection.anchorDate.toLocaleDateString("pt-BR")} e {cashProjection.endDate.toLocaleDateString("pt-BR")}.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <KpiCard label="Recebimentos Previstos" value={brl(cashProjection.expectedIncoming)} sub={`${cashProjection.expectedIncomingCount} cobrança(s)`} />
          <KpiCard label="Pagamentos Previstos" value={brl(cashProjection.scheduledOutgoing)} sub={`${cashProjection.scheduledOutgoingCount} conta(s)`} />
          <KpiCard
            label="Saldo Projetado"
            value={brl(cashProjection.projectedNet)}
            sub={`Data-base ${cashProjection.anchorDate.toLocaleDateString("pt-BR")}`}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-text-secondary">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} />
            Janela de an&aacute;lise: {cashProjection.anchorDate.toLocaleDateString("pt-BR")} at&eacute; {cashProjection.endDate.toLocaleDateString("pt-BR")}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} />
            Vencidas em aberto fora da proje&ccedil;&atilde;o: {brl(cashProjection.overdueOutgoing)}
          </span>
        </div>
      </div>

      <div className="border-b border-border-primary"></div>

      {/* Seção ALUNOS — Mês Selecionado */}
      <div>
        <p className="text-[10px] font-semibold mb-3 uppercase tracking-wider text-text-secondary">
          Alunos — {MF[curMo]}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <KpiCard label="Ativos" value={activeStudents} note={comparisonNote(activeStudents, prev?.activeStudents, (value) => String(value))} />
          <KpiCard
            label="Pagantes"
            value={cur.payingStudents}
            sub={`${data.professors.length} profs`}
            note={comparisonNote(cur.payingStudents, prev?.payingStudents, (value) => String(value))}
          />
          <KpiCard
            label="Em atraso acumulado"
            value={delinquentCount}
            sub={activeStudents > 0
              ? `No mês: ${delinquencySummary.currentMonthDelinquent} · ${((delinquentCount / activeStudents) * 100).toFixed(0)}% da base`
              : undefined}
          />
          <KpiCard label="Matrículas" value={newEnrollments} trend={trend(newEnrollments, kpiPrev?.newEnrollments ?? null)} />
          <KpiCard label="Evasões" value={churnedStudents} trend={trend(churnedStudents, kpiPrev?.churnedStudents ?? null)} invertTrend />
          <KpiCard label="Churn Rate" value={churnRate.toFixed(1) + "%"} trend={trend(churnRate, kpiPrev?.churnRate ?? null)} invertTrend />
          <KpiCard label="Permanência" value={avgTenure.toFixed(1) + " m"} />
        </div>
      </div>

      <div className="rounded-xl p-4 bg-surface-secondary border border-border-primary">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-accent-amber" />
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Prioridades do M&ecirc;s
            </h3>
          </div>
          <span className="text-[11px] text-text-tertiary font-mono">
            {activeAlertCount > 0 ? `${activeAlertCount} alerta(s)` : "Sem pendências críticas"}
          </span>
        </div>
        <div className="space-y-2">
          {priorityAlerts.length > 0 ? priorityAlerts.map((alert) => {
            const isExpanded = expandedPriority === alert.id;
            return (
              <div
                key={alert.id}
                className={cn(
                  "rounded-lg border overflow-hidden",
                  alert.tone === "warning" && "border-accent-amber/20 bg-accent-amber/5",
                  alert.tone === "info" && "border-accent-blue/20 bg-accent-blue/5"
                )}
              >
                <button
                  onClick={() => setExpandedPriority(isExpanded ? null : alert.id)}
                  className="w-full flex items-start justify-between gap-3 px-3 py-3 text-left border-none bg-transparent cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{alert.title}</p>
                    <p className="text-[11px] mt-1 text-text-secondary">{alert.detail}</p>
                  </div>
                  {alert.expandable ? (
                    isExpanded ? <ChevronDown size={14} className="mt-0.5 text-text-tertiary" /> : <ChevronRight size={14} className="mt-0.5 text-text-tertiary" />
                  ) : <ExternalLink size={14} className="mt-0.5 text-text-tertiary" />}
                </button>

                {isExpanded && alert.id === "delinquency" && (
                  <div className="border-t border-border-primary/60 px-3 py-2.5 space-y-2">
                    {delinquencySummary.students.map((entry) => (
                      <div key={entry.student.id} className="flex items-center justify-between gap-3 rounded-md bg-surface-primary/50 px-3 py-2">
                        <div>
                          <p className="text-[11px] font-semibold text-text-primary">{entry.student.name}</p>
                          <p className="text-[10px] text-text-secondary">
                            Prof. {entry.professorName} · {entry.lateMonths.length} {entry.lateMonths.length === 1 ? "mês" : "meses"} · {brl(entry.totalOwed)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setPage("profs");
                            setSelProf(entry.professorId);
                            setSelPay(entry.student.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-tertiary text-text-secondary hover:text-text-primary transition-colors border border-border-secondary text-[10px] font-medium cursor-pointer"
                        >
                          Ver aluno
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && alert.id === "overdue-bills" && (
                  <div className="border-t border-border-primary/60 px-3 py-2.5 space-y-2">
                    {overdueBills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between gap-3 rounded-md bg-surface-primary/50 px-3 py-2">
                        <div>
                          <p className="text-[11px] font-semibold text-text-primary">{bill.description}</p>
                          <p className="text-[10px] text-text-secondary">
                            Vencimento {bill.dueDate.split("-").reverse().join("/")} · {brl(bill.amount)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setPage("payables");
                            setCurMo(bill.competenceMonth ?? new Date(bill.dueDate + "T12:00:00").getMonth());
                            setSelBill(bill.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-tertiary text-text-secondary hover:text-text-primary transition-colors border border-border-secondary text-[10px] font-medium cursor-pointer"
                        >
                          Abrir conta
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="rounded-lg border border-accent-green/20 bg-accent-green/5 px-3 py-2.5">
              <p className="text-xs font-semibold text-text-primary">Sem pendências críticas</p>
              <p className="text-[11px] mt-1 text-text-secondary">
                O mês está sem contas vencidas, sem inadimplência acumulada relevante e sem alerta de equilíbrio.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Inadimplência + Rentabilidade por Curso */}
      {delinquentCount > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DelinquencyPanel professors={data.professors} currentMonth={curMo} year={data.config.year} />
          <CourseBreakdown professors={data.professors} currentMonth={curMo} year={data.config.year} />
        </div>
      ) : (
        <CourseBreakdown professors={data.professors} currentMonth={curMo} year={data.config.year} />
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
