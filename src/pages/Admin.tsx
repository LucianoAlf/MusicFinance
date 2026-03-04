import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { Send, Loader2, Users, Mail, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface Mentee {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  schools: string[];
  createdAt: string;
  lastSignIn: string | null;
}

interface Invite {
  id: string;
  email: string;
  status: string;
  accepted_at: string | null;
  created_at: string;
}

export const Admin: React.FC = () => {
  const { session } = useAuth();
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchMentees = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await supabase.functions.invoke("list-mentees", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw res.error;
      setMentees(res.data || []);
    } catch (err: any) {
      console.error("Failed to load mentees:", err);
    }
  }, [session?.access_token]);

  const fetchInvites = useCallback(async () => {
    const { data } = await supabase
      .from("invites")
      .select("id, email, status, accepted_at, created_at")
      .order("created_at", { ascending: false });
    setInvites(data || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoadingData(true);
    await Promise.all([fetchMentees(), fetchInvites()]);
    setLoadingData(false);
  }, [fetchMentees, fetchInvites]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setFeedback({ type: "error", msg: "Informe um email valido." });
      return;
    }
    setSending(true);
    setFeedback(null);

    try {
      const res = await supabase.functions.invoke("invite-user", {
        body: { email: trimmed },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error) throw new Error(res.error.message || "Erro ao enviar convite");
      if (res.data?.error) throw new Error(res.data.error);

      setFeedback({ type: "success", msg: `Convite enviado para ${trimmed}` });
      setEmail("");
      await loadAll();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Erro ao enviar convite" });
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    await supabase.from("invites").update({ status: "revoked" }).eq("id", inviteId);
    await fetchInvites();
  };

  const fmtDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const cd = "rounded-xl p-5 shadow-sm border bg-surface-secondary border-border-primary";
  const lbl = "text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5 block";

  const pendingInvites = invites.filter((i) => i.status === "pending");
  const historyInvites = invites.filter((i) => i.status !== "pending");

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between border-b border-border-primary pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Painel Admin</h1>
          <p className="text-xs mt-1 text-text-secondary">Controle de Acesso</p>
        </div>
        <button
          onClick={loadAll}
          disabled={loadingData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-secondary text-xs font-medium text-text-secondary hover:bg-surface-tertiary transition-colors cursor-pointer bg-transparent"
        >
          <RefreshCw size={14} className={cn(loadingData && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* Invite Form */}
      <div className={cd}>
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
          <Send size={14} />
          Convidar Mentorado
        </h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={lbl}>Email do Mentorado</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              placeholder="mentorado@email.com"
              className="w-full px-4 py-2.5 rounded-lg bg-surface-tertiary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-green/30 transition-all text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleInvite}
              disabled={sending || !email.trim()}
              className="px-5 py-2.5 rounded-lg bg-primary-btn-bg text-primary-btn-text text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer border-none"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              Enviar Convite
            </button>
          </div>
        </div>
        {feedback && (
          <div
            className={cn(
              "mt-3 p-3 rounded-lg text-sm flex items-center gap-2",
              feedback.type === "success"
                ? "bg-accent-green/10 text-accent-green border border-accent-green/20"
                : "bg-accent-red/10 text-accent-red border border-accent-red/20"
            )}
          >
            {feedback.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {feedback.msg}
          </div>
        )}
      </div>

      {/* Mentees List */}
      <div className={cd}>
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users size={14} />
          Mentorados Ativos ({mentees.length})
        </h3>
        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-text-tertiary" />
          </div>
        ) : mentees.length === 0 ? (
          <p className="text-sm text-text-tertiary py-4 text-center">Nenhum mentorado cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Email</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Escola</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Status</th>
                  <th className="text-right py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Desde</th>
                  <th className="text-right py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Ultimo acesso</th>
                </tr>
              </thead>
              <tbody>
                {mentees.map((m) => (
                  <tr key={m.userId} className="border-b border-border-secondary/50 hover:bg-surface-tertiary/30 transition-colors">
                    <td className="py-2.5 px-3 text-text-primary text-xs font-medium">{m.email}</td>
                    <td className="py-2.5 px-3 text-text-secondary text-xs">{m.schools.join(", ") || "Sem escola"}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-accent-green/10 text-accent-green">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                        Ativo
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-tertiary text-xs font-mono">{fmtDate(m.createdAt)}</td>
                    <td className="py-2.5 px-3 text-right text-text-tertiary text-xs font-mono">{fmtDate(m.lastSignIn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className={cd}>
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock size={14} />
            Convites Pendentes ({pendingInvites.length})
          </h3>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-tertiary border border-border-secondary">
                <div>
                  <p className="text-xs font-medium text-text-primary">{inv.email}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">Enviado em {fmtDate(inv.created_at)}</p>
                </div>
                <button
                  onClick={() => handleRevoke(inv.id)}
                  className="px-3 py-1.5 rounded-lg border border-accent-red/30 text-accent-red text-[10px] font-semibold hover:bg-accent-red/10 transition-colors cursor-pointer bg-transparent"
                >
                  Revogar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {historyInvites.length > 0 && (
        <div className={cd}>
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">
            Historico de Convites
          </h3>
          <div className="space-y-1.5">
            {historyInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-tertiary/30 transition-colors">
                <div className="flex items-center gap-2">
                  {inv.status === "accepted" ? (
                    <CheckCircle size={12} className="text-accent-green" />
                  ) : (
                    <XCircle size={12} className="text-accent-red" />
                  )}
                  <span className="text-xs text-text-secondary">{inv.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[9px] font-bold uppercase",
                    inv.status === "accepted" ? "text-accent-green" : "text-accent-red"
                  )}>
                    {inv.status === "accepted" ? "Aceito" : "Revogado"}
                  </span>
                  <span className="text-[10px] text-text-tertiary font-mono">{fmtDate(inv.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
