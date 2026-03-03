import React from "react";
import { useData } from "../context/DataContext";
import { genData } from "../data/mockData";
import { cn } from "../lib/utils";
import { School, BarChart, AlertTriangle, RefreshCw } from "lucide-react";

export const Config = () => {
  const { data, setData, dark } = useData();
  if (!data) return null;

  const cd = cn(
    "rounded-2xl p-5 shadow-sm border",
    dark ? "bg-slate-800/80 border-slate-700/50" : "bg-white border-slate-100"
  );
  const ic2 = cn(
    "w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all",
    dark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
  );

  const updateConfig = (k: keyof typeof data.config, v: string | number) => {
    setData({ ...data, config: { ...data.config, [k]: v } });
  };

  const handleReset = () => {
    if (confirm("Substituir TODOS os dados por dados de exemplo?")) {
      setData(genData());
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className={cn("text-2xl font-bold", dark ? "text-white" : "text-slate-900")}>Configurações</h1>

      <div className={cd}>
        <h3 className={cn("text-xs font-semibold mb-4 flex items-center gap-1.5", dark ? "text-slate-300" : "text-slate-700")}>
          <School size={14} /> Dados da Escola
        </h3>
        <div className="space-y-3">
          <div>
            <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
              Nome da Escola
            </label>
            <input
              value={data.config.schoolName}
              onChange={(e) => updateConfig("schoolName", e.target.value)}
              className={ic2}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
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
              <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
                Mensalidade
              </label>
              <input
                type="number"
                value={data.config.tuition}
                onChange={(e) => updateConfig("tuition", Number(e.target.value))}
                className={ic2}
              />
            </div>
            <div>
              <label className={cn("text-[10px] mb-1 block font-semibold", dark ? "text-slate-400" : "text-slate-500")}>
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
        <h3 className={cn("text-xs font-semibold mb-3 flex items-center gap-1.5", dark ? "text-slate-300" : "text-slate-700")}>
          <BarChart size={14} /> Estatísticas
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div
            className={cn(
              "p-4 rounded-xl border",
              dark ? "bg-violet-900/20 border-violet-800/30" : "bg-violet-50 border-violet-100"
            )}
          >
            <p className={cn("text-2xl font-bold", dark ? "text-violet-400" : "text-violet-700")}>{data.professors.length}</p>
            <p className={cn("text-[10px] mt-1", dark ? "text-slate-400" : "text-slate-500")}>Professores</p>
          </div>
          <div
            className={cn(
              "p-4 rounded-xl border",
              dark ? "bg-emerald-900/20 border-emerald-800/30" : "bg-emerald-50 border-emerald-100"
            )}
          >
            <p className={cn("text-2xl font-bold", dark ? "text-emerald-400" : "text-emerald-700")}>
              {data.professors.reduce((s, p) => s + p.students.length, 0)}
            </p>
            <p className={cn("text-[10px] mt-1", dark ? "text-slate-400" : "text-slate-500")}>Alunos</p>
          </div>
          <div
            className={cn(
              "p-4 rounded-xl border",
              dark ? "bg-blue-900/20 border-blue-800/30" : "bg-blue-50 border-blue-100"
            )}
          >
            <p className={cn("text-2xl font-bold", dark ? "text-blue-400" : "text-blue-700")}>
              {data.expenses.reduce((s, cc) => s + cc.items.length, 0)}
            </p>
            <p className={cn("text-[10px] mt-1", dark ? "text-slate-400" : "text-slate-500")}>Linhas Desp.</p>
          </div>
        </div>
      </div>

      <div className={cn(cd, "border-rose-200/50")}>
        <h3 className="text-xs font-semibold mb-2 text-rose-500 flex items-center gap-1.5">
          <AlertTriangle size={14} /> Zona de Perigo
        </h3>
        <p className={cn("text-[10px] mb-3", dark ? "text-slate-400" : "text-slate-500")}>
          Substituir todos os dados por dados de exemplo.
        </p>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 text-[10px] font-semibold border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
        >
          <RefreshCw size={12} /> Resetar
        </button>
      </div>
    </div>
  );
};
