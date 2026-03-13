import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { KeyRound, Eye, EyeOff, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";

interface SetPasswordModalProps {
  email: string;
  onComplete: () => void;
}

const PASS_SET_PREFIX = "musicfinance-password-set-";

/** Verifica se o usuário já definiu senha (localStorage) */
export function hasPasswordSet(userId: string): boolean {
  return localStorage.getItem(PASS_SET_PREFIX + userId) === "1";
}

/** Marca que o usuário definiu senha */
export function markPasswordSet(userId: string): void {
  localStorage.setItem(PASS_SET_PREFIX + userId, "1");
}

/**
 * Detecta se o usuário precisa definir senha.
 * Retorna true se o usuário entrou via magic link/invite e ainda não definiu senha.
 */
export function needsPasswordSetup(userId: string, amr?: Array<{ method: string }>): boolean {
  if (hasPasswordSet(userId)) return false;
  // Se não tem amr, não sabemos — assume que precisa se nunca marcou
  if (!amr || amr.length === 0) return true;
  // Se tem "password" nos métodos, já definiu senha
  const hasPassword = amr.some((a) => a.method === "password");
  if (hasPassword) {
    markPasswordSet(userId);
    return false;
  }
  return true;
}

export const SetPasswordModal: React.FC<SetPasswordModalProps> = ({ email, onComplete }) => {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  const handleSave = async () => {
    if (!newPass.trim()) { setMsg("Informe a nova senha."); setStatus("error"); return; }
    if (newPass.length < 6) { setMsg("A senha deve ter pelo menos 6 caracteres."); setStatus("error"); return; }
    if (newPass !== confirmPass) { setMsg("As senhas não conferem."); setStatus("error"); return; }
    setStatus("saving");
    setMsg("");
    try {
      const result = await Promise.race([
        supabase.auth.updateUser({ password: newPass }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Tempo esgotado. Tente novamente.")), 10000)),
      ]);
      if (result.error) {
        setStatus("error");
        setMsg(result.error.message || "Erro ao definir senha.");
      } else {
        setStatus("success");
        setMsg("Senha definida com sucesso!");
        // Marca no localStorage
        const { data: { user } } = await supabase.auth.getUser();
        if (user) markPasswordSet(user.id);
        setTimeout(onComplete, 1200);
      }
    } catch (err: any) {
      setStatus("error");
      setMsg(err?.message || "Erro inesperado.");
    }
  };

  const ic = "w-full px-4 py-3 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all bg-surface-tertiary border-border-secondary text-text-primary placeholder:text-text-tertiary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 rounded-2xl p-8 bg-surface-secondary border border-border-primary shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-accent-blue/10 flex items-center justify-center mb-4">
            <ShieldCheck size={28} className="text-accent-blue" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Bem-vindo ao MusicFinance!</h2>
          <p className="text-xs text-text-secondary mt-2 text-center leading-relaxed">
            Para sua segurança, defina uma senha para acessar o sistema.
            <br />
            Nos próximos acessos, use <span className="font-semibold text-text-primary">{email}</span> e esta senha.
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <label className="text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider">Nova Senha</label>
            <input
              type={showPass ? "text" : "password"}
              value={newPass}
              onChange={(e) => { setNewPass(e.target.value); setStatus("idle"); setMsg(""); }}
              placeholder="Mínimo 6 caracteres"
              className={ic}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-[28px] p-1 rounded text-text-tertiary hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div>
            <label className="text-[10px] mb-1 block font-semibold text-text-secondary uppercase tracking-wider">Confirmar Senha</label>
            <input
              type={showPass ? "text" : "password"}
              value={confirmPass}
              onChange={(e) => { setConfirmPass(e.target.value); setStatus("idle"); setMsg(""); }}
              placeholder="Repita a senha"
              className={ic}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          {msg && (
            <div className={cn(
              "flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg",
              status === "success" ? "bg-accent-green/10 text-accent-green" : "bg-accent-red/10 text-accent-red"
            )}>
              {status === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {msg}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving" || status === "success"}
            className="w-full py-3 rounded-lg bg-accent-blue text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity border-none cursor-pointer mt-2"
          >
            {status === "saving" ? "Salvando..." : status === "success" ? "✓ Pronto!" : "Definir Senha"}
          </button>
        </div>
      </div>
    </div>
  );
};
