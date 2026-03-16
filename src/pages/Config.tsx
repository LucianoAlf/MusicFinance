import React, { useState, useRef, useCallback, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { School, BarChart, KeyRound, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { ImportWizard } from "../components/ImportWizard";

export const Config = () => {
  const { data, handleUpdateConfig } = useData();
  const { user } = useAuth();
  const [localYear, setLocalYear] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Estado do formulário de senha
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passStatus, setPassStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [passMsg, setPassMsg] = useState("");

  const handleChangePassword = async () => {
    if (!newPass.trim()) { setPassMsg("Informe a nova senha."); setPassStatus("error"); return; }
    if (newPass.length < 6) { setPassMsg("A senha deve ter pelo menos 6 caracteres."); setPassStatus("error"); return; }
    if (newPass !== confirmPass) { setPassMsg("As senhas não conferem."); setPassStatus("error"); return; }
    setPassStatus("saving");
    setPassMsg("");
    try {
      const result = await Promise.race([
        supabase.auth.updateUser({ password: newPass }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Tempo esgotado. Tente novamente.")), 30000)),
      ]);
      if (result.error) {
        setPassStatus("error");
        setPassMsg(result.error.message || "Erro ao atualizar senha.");
      } else {
        setPassStatus("success");
        setPassMsg("Senha definida com sucesso! Agora você pode usar e-mail e senha para entrar.");
        setNewPass("");
        setConfirmPass("");
      }
    } catch (err: any) {
      setPassStatus("error");
      setPassMsg(err?.message || "Erro inesperado ao atualizar senha.");
    }
  };

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

          {/* Definir / Trocar Senha */}
          <div className={cd}>
            <h3 className="text-xs font-semibold mb-4 text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound size={14} /> Definir / Trocar Senha
            </h3>
            <p className="text-[10px] text-text-secondary mb-3 leading-relaxed">
              {user?.email && <>Logado como <span className="font-semibold text-text-primary">{user.email}</span>. </>}
              Defina uma senha para poder entrar com e-mail e senha em qualquer dispositivo.
            </p>
            <div className="space-y-3">
              <div className="relative">
                <label className="text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider">Nova Senha</label>
                <input
                  type={showPass ? "text" : "password"}
                  value={newPass}
                  onChange={(e) => { setNewPass(e.target.value); setPassStatus("idle"); setPassMsg(""); }}
                  placeholder="Mínimo 6 caracteres"
                  className={ic2}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-[26px] p-1 rounded text-text-tertiary hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div>
                <label className="text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider">Confirmar Senha</label>
                <input
                  type={showPass ? "text" : "password"}
                  value={confirmPass}
                  onChange={(e) => { setConfirmPass(e.target.value); setPassStatus("idle"); setPassMsg(""); }}
                  placeholder="Repita a senha"
                  className={ic2}
                  onKeyDown={(e) => { if (e.key === "Enter") handleChangePassword(); }}
                />
              </div>
              {passMsg && (
                <div className={cn(
                  "flex items-center gap-1.5 text-[10px] px-3 py-2 rounded-lg",
                  passStatus === "success" ? "bg-accent-green/10 text-accent-green" : "bg-accent-red/10 text-accent-red"
                )}>
                  {passStatus === "success" ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {passMsg}
                </div>
              )}
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={passStatus === "saving"}
                className="w-full py-2.5 rounded-lg bg-accent-blue text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity border-none cursor-pointer"
              >
                {passStatus === "saving" ? "Salvando..." : "Salvar Senha"}
              </button>
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
