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
    <div className="min-h-screen flex items-center justify-center bg-surface-primary px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-tertiary mb-4 border border-border-primary">
            <Music className="w-8 h-8 text-text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary font-sans uppercase">MusicFinance</h1>
          <p className="text-text-secondary mt-1 text-sm">Dashboard Financeiro para Escolas de Musica</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-secondary rounded-xl p-8 border border-border-primary">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Entrar na sua conta</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-surface-tertiary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-border-hover transition-all"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-surface-tertiary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-border-hover transition-all"
                placeholder="Sua senha"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-2.5 rounded-lg bg-accent-blue text-surface-primary font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border-none"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Entrar
          </button>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Nao tem conta?{" "}
            <button type="button" onClick={onGoToSignup} className="text-accent-blue hover:text-accent-blue/80 font-medium cursor-pointer bg-transparent border-none">
              Cadastre-se
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};
