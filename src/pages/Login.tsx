import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Loader2, Music } from "lucide-react";

interface Props {
  onGoToSignup: () => void;
}

export const Login: React.FC<Props> = ({ onGoToSignup }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn(email, password);
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
          <h1 className="text-2xl font-bold text-white">MusicFinance</h1>
          <p className="text-slate-400 mt-1 text-sm">Dashboard Financeiro para Escolas de Musica</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-700/50">
          <h2 className="text-lg font-semibold text-white mb-6">Entrar na sua conta</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                placeholder="Sua senha"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold hover:from-violet-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Entrar
          </button>

          <p className="mt-6 text-center text-sm text-slate-400">
            Nao tem conta?{" "}
            <button type="button" onClick={onGoToSignup} className="text-violet-400 hover:text-violet-300 font-medium cursor-pointer bg-transparent border-none">
              Cadastre-se
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};
