import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-surface-primary px-4">
      <div className="w-full max-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-2">
            <img src="/Avatar_Porquinho.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tighter text-text-primary font-logo">
            {isFirstSchool ? "Crie sua primeira escola" : "Nova escola"}
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            {isFirstSchool
              ? "Configure os dados basicos da sua escola de musica"
              : "Adicione uma nova escola ao seu painel"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-secondary rounded-xl p-8 border border-border-primary">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nome da escola</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-surface-tertiary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-border-hover transition-all"
                placeholder="Ex: Escola de Musica Tom Jobim"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Mensalidade padrao</label>
                <input
                  type="number"
                  value={tuition}
                  onChange={(e) => setTuition(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-tertiary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-border-hover transition-all"
                  placeholder="350"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Taxa de matricula</label>
                <input
                  type="number"
                  value={passport}
                  onChange={(e) => setPassport(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-tertiary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-border-hover transition-all"
                  placeholder="350"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Ano de referencia</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-surface-tertiary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-border-hover transition-all"
                placeholder="2026"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border-none"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Criar escola
          </button>

          {onBack && (
            <p className="mt-4 text-center">
              <button type="button" onClick={onBack} className="text-[10px] text-text-secondary hover:text-text-primary uppercase tracking-wider font-semibold transition-colors cursor-pointer bg-transparent border-none">
                Voltar
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
