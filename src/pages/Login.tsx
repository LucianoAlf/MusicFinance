import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Loader2, LayoutDashboard, Users, DollarSign, Receipt, TrendingUp } from "lucide-react";

const FEATURES = [
  { icon: LayoutDashboard, title: "Dashboard com KPIs", desc: "Receita, ticket medio, ponto de equilibrio e churn em tempo real" },
  { icon: Users, title: "Professores & Alunos", desc: "Gestao completa de matriculas, pagamentos e inadimplencia" },
  { icon: DollarSign, title: "Controle Financeiro", desc: "Receitas dinamicas, despesas por centro de custo e fluxo mensal" },
  { icon: Receipt, title: "Contas a Pagar", desc: "Lancamentos com parcelas, categorias e itens de despesa" },
  { icon: TrendingUp, title: "DRE Automatico", desc: "Demonstrativo de resultado com margem de contribuicao e EBITDA" },
];

export const Login: React.FC<{ externalError?: string | null }> = ({ externalError }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sanitizeError = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes("invalid login") || lower.includes("invalid password") || lower.includes("user not found"))
      return "Email ou senha incorretos.";
    if (lower.includes("email not confirmed"))
      return "Email ainda nao confirmado. Verifique sua caixa de entrada.";
    if (lower.includes("too many requests") || lower.includes("rate limit"))
      return "Muitas tentativas. Aguarde alguns minutos.";
    if (lower.includes("network") || lower.includes("fetch"))
      return "Erro de conexao. Verifique sua internet.";
    return "Erro ao entrar. Tente novamente.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn(email, password);
    if (result.error) setError(sanitizeError(result.error));
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Hero Panel (Left) */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden bg-[#0a0e14]">
        <img
          src="/luciano.png"
          alt="MusicFinance"
          className="absolute inset-0 w-full h-full object-cover object-[35%_top] opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-[#0a0e14]/70 to-transparent" />

        <div className="relative z-10 flex flex-col justify-end p-12 pb-16 h-full">
          <div className="mt-auto max-w-lg">
            <div className="flex items-center gap-3.5 mb-8">
              <img src="/porquinho.png" alt="Logo" className="w-12 h-12 drop-shadow-md" />
              <span className="font-logo text-[28px] font-extrabold tracking-tighter text-white pt-1">MusicFinance</span>
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white mb-4">
              Gestão financeira{" "}
              <span className="text-accent-green">inteligente</span> para{" "}
              escolas de música
            </h1>

            <p className="text-[15px] text-white/60 leading-relaxed mb-10">
              Dashboard completo com KPIs em tempo real, controle de inadimplência, DRE automático e visão unificada de alunos, professores e receita. Feito por quem entende o mercado de educação musical.
            </p>

            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                  <div className="w-8 h-8 rounded-lg bg-accent-green/15 flex items-center justify-center flex-shrink-0">
                    <f.icon size={16} className="text-accent-green" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{f.title}</p>
                    <p className="text-[11px] text-white/50">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-10 text-[11px] text-white/30">
              &copy; {new Date().getFullYear()} LA Music School. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* Form Panel (Right) */}
      <div className="flex-1 flex items-center justify-center bg-surface-primary px-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-2">
              <img src="/porquinho.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tighter text-text-primary font-logo">MusicFinance</h1>
            <p className="text-text-secondary mt-1 text-sm">Dashboard Financeiro para Escolas de Musica</p>
          </div>

          <div className="mb-8 hidden lg:block">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">Bem-vindo de volta</h2>
            <p className="text-text-secondary mt-1 text-sm">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit}>
            {(error || externalError) && (
              <div className="mb-4 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
                {error || externalError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-surface-secondary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 transition-all text-sm"
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
                  className="w-full px-4 py-3 rounded-xl bg-surface-secondary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 transition-all text-sm"
                  placeholder="Sua senha"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 rounded-xl bg-accent-green text-[#0a0e14] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Entrar no Sistema
            </button>

            <p className="mt-6 text-center text-[11px] text-text-tertiary">
              Acesso exclusivo para membros da mentoria Maestros da Gestão.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
