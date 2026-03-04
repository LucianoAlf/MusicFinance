import React, { useState, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { cn } from "../lib/utils";
import {
  parseFile,
  mapHeaders,
  normalizeRows,
  buildSnapshot,
  computeDiff,
  executeActions,
  getImportHistory,
  saveImportHistory,
  downloadTemplate,
  type ImportAction,
  type ImportHistoryEntry,
  type ExistingData,
} from "../lib/importService";
import { Select } from "./ui";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Check,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  UserMinus,
  DollarSign,
  ArrowRightLeft,
  CreditCard,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const MONTHS = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

type Step = "upload" | "preview" | "executing" | "done";

export const ImportWizard: React.FC = () => {
  const { selectedSchool } = useAuth();
  const { data, instruments, refreshData } = useData();
  const schoolId = selectedSchool?.id;

  const [step, setStep] = useState<Step>("upload");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(data?.config.year || new Date().getFullYear());
  const [fileName, setFileName] = useState("");
  const [actions, setActions] = useState<ImportAction[]>([]);
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [parseError, setParseError] = useState("");
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [execResult, setExecResult] = useState<{ success: boolean; error?: string; stats?: any } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    if (!schoolId || historyLoaded) return;
    const h = await getImportHistory(schoolId);
    setHistory(h);
    setHistoryLoaded(true);
  }, [schoolId, historyLoaded]);

  React.useEffect(() => { loadHistory(); }, [loadHistory]);

  const cd = "rounded-xl p-5 shadow-sm border bg-surface-secondary border-border-primary";
  const btn = "flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all border-none cursor-pointer";
  const btnPrimary = cn(btn, "bg-primary-btn-bg text-primary-btn-text hover:opacity-90");
  const btnSecondary = cn(btn, "bg-surface-tertiary text-text-primary border border-border-secondary hover:bg-surface-accent");
  const btnDanger = cn(btn, "bg-accent-red text-white hover:opacity-90");

  // ─── File handling ──────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    if (!data || !schoolId) return;
    setParseError("");
    setFileName(file.name);

    try {
      const rawData = await parseFile(file);
      const mapped = mapHeaders(rawData);

      if (mapped.length === 0) {
        setParseError("Nenhuma linha valida encontrada. Verifique se as colunas da planilha correspondem ao template.");
        return;
      }

      const normalized = normalizeRows(mapped, year, month);
      const snapshot = buildSnapshot(normalized);

      const existing: ExistingData = {
        professors: data.professors,
        instruments: instruments,
        schoolId,
        year,
        defaultTuition: data.config.tuition,
      };

      const diff = computeDiff(snapshot, existing, month);
      setActions(diff);
      setStep("preview");
    } catch (err: any) {
      setParseError(err.message || "Erro ao processar arquivo");
    }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // ─── Action toggles ────────────────────────────────────────────────────────

  const toggleAction = (idx: number) => {
    setActions((prev) => prev.map((a, i) => i === idx ? { ...a, enabled: !a.enabled } : a));
  };

  const setChurnChoice = (idx: number, choice: "Evadido" | "Trancado" | "ignore") => {
    setActions((prev) =>
      prev.map((a, i) =>
        i === idx ? { ...a, churnChoice: choice, enabled: choice !== "ignore" } : a
      )
    );
  };

  // ─── Execute ────────────────────────────────────────────────────────────────

  const handleExecute = async () => {
    if (!schoolId || !data) return;
    setStep("executing");
    setProgressDone(0);
    setProgressTotal(actions.filter((a) => a.enabled).length);

    const result = await executeActions(
      actions,
      schoolId,
      year,
      month,
      data.config.tuition,
      [...instruments],
      (done, total) => {
        setProgressDone(done);
        setProgressTotal(total);
      }
    );

    if (result.success) {
      await saveImportHistory(schoolId, year, month, result.stats, fileName);
      const h = await getImportHistory(schoolId);
      setHistory(h);
    }

    await refreshData();
    setExecResult(result);
    setStep("done");
  };

  // ─── Counts ─────────────────────────────────────────────────────────────────

  const countByType = (type: string) => actions.filter((a) => a.type === type).length;
  const enabledCount = actions.filter((a) => a.enabled).length;

  // ─── Group actions for display ──────────────────────────────────────────────

  const groups: { type: string; icon: React.ElementType; title: string; color: string; types: string[] }[] = [
    { type: "profs_new", icon: UserPlus, title: "Novos Professores", color: "text-accent-blue", types: ["CREATE_PROFESSOR"] },
    { type: "profs_update", icon: Users, title: "Alteracoes em Professores", color: "text-accent-amber", types: ["UPDATE_PROFESSOR", "ADD_PROFESSOR_INSTRUMENT", "DEACTIVATE_PROFESSOR"] },
    { type: "students_new", icon: UserPlus, title: "Matriculas Novas", color: "text-accent-green", types: ["CREATE_STUDENT"] },
    { type: "churn", icon: UserMinus, title: "Possiveis Evasoes", color: "text-accent-red", types: ["POSSIBLE_CHURN"] },
    { type: "tuition", icon: DollarSign, title: "Reajustes de Mensalidade", color: "text-accent-amber", types: ["UPDATE_TUITION"] },
    { type: "transfers", icon: ArrowRightLeft, title: "Transferencias", color: "text-accent-blue", types: ["TRANSFER_STUDENT"] },
    { type: "updates", icon: Users, title: "Outras Alteracoes", color: "text-text-secondary", types: ["UPDATE_SITUATION", "UPDATE_COURSE", "UPDATE_SCHEDULE"] },
    { type: "payments", icon: CreditCard, title: "Pagamentos do Mes", color: "text-accent-green", types: ["CONFIRM_PAYMENT", "PENDING_PAYMENT"] },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!data) return null;

  const monthOptions = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));
  const yearOptions = [year - 1, year, year + 1].map((y) => ({ value: String(y), label: String(y) }));

  const existingImport = history.find((h) => h.year === year && h.month === month);

  return (
    <div className="space-y-4">
      {/* ── Step: Upload ──────────────────────────────────────────────────── */}
      {step === "upload" && (
        <>
          <div className={cd}>
            <h3 className="text-xs font-semibold mb-4 text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Upload size={14} /> Importar Dados do Mes
            </h3>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-40">
                <label className="text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider">Mes</label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))} options={monthOptions} placeholder="Mes" />
              </div>
              <div className="w-28">
                <label className="text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider">Ano</label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))} options={yearOptions} placeholder="Ano" />
              </div>
            </div>

            {existingImport && (
              <div className="mb-4 p-3 rounded-lg bg-accent-amber/10 border border-accent-amber/20 text-[11px] text-accent-amber flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>
                  Esse mes ja foi importado em {new Date(existingImport.imported_at).toLocaleDateString("pt-BR")}.
                  Uma nova importacao substituira os dados anteriores.
                </span>
              </div>
            )}

            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                dragging
                  ? "border-accent-green bg-accent-green/5"
                  : "border-border-secondary hover:border-border-hover"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <FileSpreadsheet size={32} className="mx-auto mb-3 text-text-tertiary" />
              <p className="text-sm font-medium text-text-secondary mb-1">
                Arraste seu arquivo CSV ou XLSX aqui
              </p>
              <p className="text-[11px] text-text-tertiary">
                Formatos: .csv, .xlsx, .xls
              </p>
              <p className="text-[10px] text-text-tertiary mt-2">
                O template agora inclui "Data Matrícula" e "Data Saída" para calcular o Tempo de Permanência.
              </p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileInput} />
            </div>

            {parseError && (
              <div className="mt-3 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-[11px] text-accent-red">
                {parseError}
              </div>
            )}

            <button onClick={downloadTemplate} className={cn(btnSecondary, "mt-4")}>
              <Download size={12} /> Baixar template de exemplo (.xlsx)
            </button>
          </div>

          {history.length > 0 && (
            <div className={cd}>
              <h3 className="text-xs font-semibold mb-3 text-text-primary uppercase tracking-wider">
                Historico de Importacoes
              </h3>
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-[11px] py-1.5 px-2 rounded-lg bg-surface-tertiary">
                    <CheckCircle2 size={12} className="text-accent-green flex-shrink-0" />
                    <span className="text-text-primary font-medium">
                      {MONTHS[h.month - 1]} {h.year}
                    </span>
                    <span className="text-text-tertiary">
                      — {h.professors_created} profs, {h.students_created} alunos, {h.payments_confirmed} pgtos
                    </span>
                    <span className="text-text-tertiary ml-auto">
                      {new Date(h.imported_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Step: Preview ─────────────────────────────────────────────────── */}
      {step === "preview" && (
        <>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-text-primary">
              Preview — {MONTHS[month - 1]} {year}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={() => { setStep("upload"); setActions([]); }} className={btnSecondary}>
                <ChevronLeft size={12} /> Voltar
              </button>
              <button onClick={handleExecute} disabled={enabledCount === 0} className={cn(btnPrimary, enabledCount === 0 && "opacity-50 cursor-not-allowed")}>
                Aplicar {enabledCount} acoes <ChevronRight size={12} />
              </button>
            </div>
          </div>

          <p className="text-[11px] text-text-secondary mb-4">
            Arquivo: <span className="font-medium text-text-primary">{fileName}</span> — {actions.length} acoes detectadas, {enabledCount} habilitadas
          </p>

          {groups.map((g) => {
            const groupActions = actions
              .map((a, i) => ({ ...a, idx: i }))
              .filter((a) => g.types.includes(a.type));
            if (groupActions.length === 0) return null;

            return (
              <div key={g.type} className={cd}>
                <h4 className={cn("text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-1.5", g.color)}>
                  <g.icon size={14} />
                  {g.title} ({groupActions.length})
                </h4>
                <div className="space-y-1.5">
                  {groupActions.map((a) => (
                    <div
                      key={a.idx}
                      className={cn(
                        "flex items-center gap-2 py-2 px-3 rounded-lg text-[11px] transition-colors",
                        a.enabled ? "bg-surface-tertiary" : "bg-surface-tertiary/30 opacity-60"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={a.enabled}
                        onChange={() => toggleAction(a.idx)}
                        className="accent-accent-green flex-shrink-0"
                      />
                      <span className={cn("flex-1", a.enabled ? "text-text-primary" : "text-text-tertiary")}>
                        {a.label}
                      </span>

                      {a.type === "POSSIBLE_CHURN" && a.enabled && (
                        <div className="flex gap-1">
                          {(["Evadido", "Trancado"] as const).map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setChurnChoice(a.idx, opt)}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer",
                                a.churnChoice === opt
                                  ? "bg-accent-red/20 border-accent-red text-accent-red font-semibold"
                                  : "bg-transparent border-border-secondary text-text-tertiary hover:border-border-hover"
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                          <button
                            onClick={() => setChurnChoice(a.idx, "ignore")}
                            className="px-2 py-0.5 rounded text-[10px] border bg-transparent border-border-secondary text-text-tertiary hover:border-border-hover cursor-pointer"
                          >
                            Ignorar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Summary bar */}
          <div className={cn(cd, "flex items-center justify-between")}>
            <div className="flex items-center gap-4 text-[11px] text-text-secondary flex-wrap">
              {countByType("CREATE_PROFESSOR") > 0 && <span>{countByType("CREATE_PROFESSOR")} profs novos</span>}
              {countByType("CREATE_STUDENT") > 0 && <span>{countByType("CREATE_STUDENT")} matriculas</span>}
              {countByType("POSSIBLE_CHURN") > 0 && <span>{countByType("POSSIBLE_CHURN")} evasoes</span>}
              {countByType("UPDATE_TUITION") > 0 && <span>{countByType("UPDATE_TUITION")} reajustes</span>}
              {countByType("TRANSFER_STUDENT") > 0 && <span>{countByType("TRANSFER_STUDENT")} transferencias</span>}
              {countByType("CONFIRM_PAYMENT") > 0 && <span>{countByType("CONFIRM_PAYMENT")} pagamentos</span>}
            </div>
            <button onClick={handleExecute} disabled={enabledCount === 0} className={cn(btnPrimary, enabledCount === 0 && "opacity-50 cursor-not-allowed")}>
              Aplicar {enabledCount} acoes <ChevronRight size={12} />
            </button>
          </div>
        </>
      )}

      {/* ── Step: Executing ───────────────────────────────────────────────── */}
      {step === "executing" && (
        <div className={cn(cd, "text-center py-12")}>
          <Loader2 size={32} className="mx-auto mb-4 text-accent-green animate-spin" />
          <p className="text-sm font-semibold text-text-primary mb-2">Importando dados...</p>
          <p className="text-[11px] text-text-secondary mb-4">{progressDone} de {progressTotal} acoes</p>
          <div className="w-full max-w-xs mx-auto h-2 rounded-full bg-surface-tertiary overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-green transition-all duration-300"
              style={{ width: progressTotal > 0 ? `${(progressDone / progressTotal) * 100}%` : "0%" }}
            />
          </div>
        </div>
      )}

      {/* ── Step: Done ────────────────────────────────────────────────────── */}
      {step === "done" && execResult && (
        <div className={cn(cd, "text-center py-10")}>
          {execResult.success ? (
            <>
              <CheckCircle2 size={40} className="mx-auto mb-4 text-accent-green" />
              <p className="text-lg font-bold text-text-primary mb-2">Importacao concluida</p>
              <p className="text-[11px] text-text-secondary mb-6">{MONTHS[month - 1]} {year}</p>
              <div className="flex flex-wrap justify-center gap-4 text-[11px] text-text-secondary mb-6">
                {execResult.stats?.professorsCreated > 0 && <span>{execResult.stats.professorsCreated} professores criados</span>}
                {execResult.stats?.studentsCreated > 0 && <span>{execResult.stats.studentsCreated} alunos matriculados</span>}
                {execResult.stats?.studentsChurned > 0 && <span>{execResult.stats.studentsChurned} evasoes registradas</span>}
                {execResult.stats?.paymentsConfirmed > 0 && <span>{execResult.stats.paymentsConfirmed} pagamentos confirmados</span>}
                {execResult.stats?.tuitionChanges > 0 && <span>{execResult.stats.tuitionChanges} reajustes</span>}
                {execResult.stats?.transfers > 0 && <span>{execResult.stats.transfers} transferencias</span>}
              </div>
            </>
          ) : (
            <>
              <XCircle size={40} className="mx-auto mb-4 text-accent-red" />
              <p className="text-lg font-bold text-text-primary mb-2">Erro na importacao</p>
              <p className="text-[11px] text-accent-red">{execResult.error}</p>
            </>
          )}
          <button
            onClick={() => { setStep("upload"); setActions([]); setExecResult(null); setFileName(""); }}
            className={btnPrimary}
          >
            <Check size={12} /> Nova Importacao
          </button>
        </div>
      )}
    </div>
  );
};
