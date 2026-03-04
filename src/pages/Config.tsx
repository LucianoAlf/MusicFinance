import React from "react";
import { useData } from "../context/DataContext";
import { ConfirmModal, useConfirm } from "../components/ui";
import { cn } from "../lib/utils";
import { School, BarChart, AlertTriangle, RefreshCw } from "lucide-react";

export const Config = () => {
  const { data, handleUpdateConfig, handleResetData } = useData();
  const { state: confirmState, confirm, close: confirmClose } = useConfirm();

  if (!data) return null;

  const cd = "rounded-xl p-4 shadow-sm border bg-surface-secondary border-border-primary";
  const ic2 = "w-full px-3 py-2.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-border-hover transition-all bg-surface-tertiary border-border-secondary text-text-primary";

  const updateConfig = (k: keyof typeof data.config, v: string | number) => {
    handleUpdateConfig(k, v);
  };

  const handleReset = () => {
    confirm({
      title: "Resetar Dados",
      message: "Resetar TODOS os dados desta escola? Centros de custo e categorias de receita serão recriados com valores padrão. Esta ação não pode ser desfeita.",
      confirmLabel: "Resetar",
      variant: "danger",
      onConfirm: () => handleResetData(),
    });
  };

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Configurações</h1>

      <div className={cd}>
        <h3 className="text-xs font-semibold mb-4 text-text-primary uppercase tracking-wider flex items-center gap-1.5">
          <School size={14} /> Dados da Escola
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider">
              Nome da Escola
            </label>
            <input
              value={data.config.schoolName}
              onChange={(e) => updateConfig("schoolName", e.target.value)}
              className={ic2}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider">
                Ano
              </label>
              <input
                type="number"
                value={data.config.year}
                onChange={(e) => updateConfig("year", Number(e.target.value))}
                className={ic2}
              />
            </div>
            <div>
              <label className="text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider">
                Parcela
              </label>
              <input
                type="number"
                value={data.config.tuition}
                onChange={(e) => updateConfig("tuition", Number(e.target.value))}
                className={ic2}
              />
            </div>
            <div>
              <label className="text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider">
                Passaporte
              </label>
              <input
                type="number"
                value={data.config.passport || 350}
                onChange={(e) => updateConfig("passport", Number(e.target.value))}
                className={ic2}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={cd}>
        <h3 className="text-xs font-semibold mb-4 text-text-primary uppercase tracking-wider flex items-center gap-1.5">
          <BarChart size={14} /> Estatísticas
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-xl border bg-surface-tertiary border-border-secondary">
            <p className="text-2xl font-mono font-bold text-accent-blue">{data.professors.length}</p>
            <p className="text-[10px] mt-1 text-text-secondary uppercase tracking-wider">Professores</p>
          </div>
          <div className="p-4 rounded-xl border bg-surface-tertiary border-border-secondary">
            <p className="text-2xl font-mono font-bold text-accent-green">
              {data.professors.reduce((s, p) => s + p.students.length, 0)}
            </p>
            <p className="text-[10px] mt-1 text-text-secondary uppercase tracking-wider">Alunos</p>
          </div>
          <div className="p-4 rounded-xl border bg-surface-tertiary border-border-secondary">
            <p className="text-2xl font-mono font-bold text-accent-amber">
              {data.expenses.reduce((s, cc) => s + cc.items.length, 0)}
            </p>
            <p className="text-[10px] mt-1 text-text-secondary uppercase tracking-wider">Linhas Desp.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4 shadow-sm border bg-accent-red/5 border-accent-red/20">
        <h3 className="text-xs font-semibold mb-2 text-accent-red flex items-center gap-1.5 uppercase tracking-wider">
          <AlertTriangle size={14} /> Zona de Perigo
        </h3>
        <p className="text-[10px] mb-3 text-text-secondary">
          Resetar todos os dados da escola. Centros de custo e categorias de receita serão recriados com valores padrão.
        </p>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent-red text-surface-primary text-xs font-semibold border border-transparent hover:opacity-90 transition-opacity cursor-pointer"
        >
          <RefreshCw size={12} /> Resetar
        </button>
      </div>

      <ConfirmModal
        open={confirmState.open}
        onOpenChange={confirmClose}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
      />
    </div>
  );
};
