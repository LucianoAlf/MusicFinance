import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  onGoToLogin: () => void;
}

export const Signup: React.FC<Props> = ({ onGoToLogin }) => {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas nao conferem.");
      return;
    }

    setLoading(true);
    const result = await signUp(name, email, password);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-2">
            <img src="/porquinho.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tighter text-text-primary font-logo">MusicFinance</h1>
          <p className="text-text-secondary mt-1 text-sm">Crie sua conta para comecar</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-secondary rounded-xl p-8 border border-border-primary">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Criar conta</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nome completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-surface-tertiary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-border-hover transition-all"
                placeholder="Seu nome"
              />
            </div>
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
                placeholder="Minimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Confirmar senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-surface-tertiary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-border-hover transition-all"
                placeholder="Repita a senha"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border-none"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Criar conta
          </button>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Ja tem conta?{" "}
            <button type="button" onClick={onGoToLogin} className="text-accent-blue hover:text-accent-blue/80 font-medium cursor-pointer bg-transparent border-none">
              Entrar
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};
