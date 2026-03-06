import React, { useState, useRef, useCallback, useEffect } from "react";
import { useData } from "../context/DataContext";
import { cn } from "../lib/utils";
import { School, BarChart } from "lucide-react";
import { ImportWizard } from "../components/ImportWizard";

export const Config = () => {
  const { data, handleUpdateConfig } = useData();
  const [localYear, setLocalYear] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (data) setLocalYear(String(data.config.year));
  }, [data?.config.year]);

  if (!data) return null;

  const cd = "rounded-xl p-4 shadow-sm border bg-surface-secondary border-border-primary";
  const ic2 = "w-full px-3 py-2.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-border-hover transition-all bg-surface-tertiary border-border-secondary text-text-primary";

  const updateConfig = (k: keyof typeof data.config, v: string | number) => {
    handleUpdateConfig(k, v);
  };

  const handleYearChange = (v: string) => {
    setLocalYear(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const num = Number(v);
      if (num >= 2020 && num <= 2099) {
        updateConfig("year", num);
      }
    }, 1000);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Configurações</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left: Dados da Escola + Estatisticas */}
        <div className="space-y-4">
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
                    value={localYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    min={2020}
                    max={2099}
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
        </div>

        {/* Right: Import Wizard */}
        <ImportWizard />
      </div>
    </div>
  );
};
