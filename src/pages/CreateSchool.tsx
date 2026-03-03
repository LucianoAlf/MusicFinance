import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Loader2, Music } from "lucide-react";

interface Props {
  onBack?: () => void;
}

export const CreateSchool: React.FC<Props> = ({ onBack }) => {
  const { createSchool, schools } = useAuth();
  const [name, setName] = useState("");
  const [tuition, setTuition] = useState("350");
  const [passport, setPassport] = useState("350");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isFirstSchool = schools.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nome da escola e obrigatorio.");
      return;
    }

    setLoading(true);
    const result = await createSchool(
      name.trim(),
      Number(tuition) || 350,
      Number(passport) || 350,
      Number(year) || new Date().getFullYear()
    );
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 mb-4">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isFirstSchool ? "Crie sua primeira escola" : "Nova escola"}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {isFirstSchool
              ? "Configure os dados basicos da sua escola de musica"
              : "Adicione uma nova escola ao seu painel"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-700/50">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome da escola</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                placeholder="Ex: Escola de Musica Tom Jobim"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Mensalidade padrao</label>
                <input
                  type="number"
                  value={tuition}
                  onChange={(e) => setTuition(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  placeholder="350"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Taxa de matricula</label>
                <input
                  type="number"
                  value={passport}
                  onChange={(e) => setPassport(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  placeholder="350"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Ano de referencia</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                placeholder="2026"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold hover:from-violet-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Criar escola
          </button>

          {onBack && (
            <p className="mt-4 text-center">
              <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-none">
                Voltar
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
