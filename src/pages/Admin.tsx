import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { Send, Loader2, Users, Mail, Clock, CheckCircle, XCircle, Pause, Play, Trash2, MoreVertical, KeyRound } from "lucide-react";

interface Mentee {
  userId: string;
  email: string;
  role: string;
  status: string;
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

/** Wrapper com timeout para promises (Edge Functions podem travar no cold start) */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label}: timeout ${ms}ms`)), ms)),
  ]);
}

export const Admin: React.FC = () => {
  const { session, isSuperadmin, user } = useAuth();
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMentees, setLoadingMentees] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const mountedRef = useRef(true);

  /** Busca token fresco */
  const getFreshToken = useCallback(async () => {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed?.session?.access_token) {
      return refreshed.session.access_token;
    }
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || session?.access_token || "";
  }, [session]);

  const fetchMentees = useCallback(async () => {
    setLoadingMentees(true);
    try {
      const { data, error } = await supabase.rpc("list_mentees");
      if (!mountedRef.current) return;
      if (error) { console.error("[Admin] list_mentees RPC:", error); return; }
      setMentees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[Admin] fetchMentees:", err);
    } finally {
      if (mountedRef.current) setLoadingMentees(false);
    }
  }, []);

  const fetchInvites = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const { data } = await supabase
        .from("invites")
        .select("id, email, status, accepted_at, created_at")
        .order("created_at", { ascending: false });
      if (mountedRef.current) setInvites(data || []);
    } catch {
      if (mountedRef.current) setInvites([]);
    } finally {
      if (mountedRef.current) setLoadingInvites(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!isSuperadmin || !user?.id) return;
    // Invites carregam instantaneamente, mentorados no background
    fetchInvites();
    fetchMentees();
    return () => { mountedRef.current = false; };
  }, [isSuperadmin, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

  if (!isSuperadmin) return null;

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setFeedback({ type: "error", msg: "Informe um email valido." });
      return;
    }
    setSending(true);
    setFeedback(null);

    try {
      const token = await getFreshToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");
      const res = await withTimeout(
        supabase.functions.invoke("invite-user", {
          body: { email: trimmed },
          headers: { Authorization: `Bearer ${token}` },
        }),
        25000, "invite-user"
      );
      if (res.error) throw new Error(res.error.message || "Erro ao enviar convite");
      if (res.data?.error) throw new Error(res.data.error);

      setFeedback({ type: "success", msg: `Convite enviado para ${trimmed}` });
      setEmail("");
      fetchInvites();
      fetchMentees();
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

  const handleMenteeAction = async (action: "pause" | "activate" | "delete" | "resend_access", userId: string) => {
    setActionLoading(userId);
    setFeedback(null);
    try {
      const token = await getFreshToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");
      const res = await withTimeout(
        supabase.functions.invoke("manage-mentee", {
          body: { action, userId },
          headers: { Authorization: `Bearer ${token}` },
        }),
        20000, "manage-mentee"
      );
      if (res.error) throw new Error(res.error.message || "Erro na operacao");
      if (res.data?.error) throw new Error(res.data.error);

      const msgs: Record<string, string> = {
        pause: "Mentorado pausado com sucesso",
        activate: "Mentorado reativado com sucesso",
        delete: "Mentorado excluido com sucesso",
        resend_access: "Email para definir nova senha enviado",
      };
      setFeedback({ type: "success", msg: msgs[action] });
      setConfirmDelete(null);
      setOpenMenu(null);
      fetchInvites();
      fetchMentees();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Erro ao executar acao" });
    } finally {
      setActionLoading(null);
    }
  };

  const fmtDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const cd = "rounded-xl p-5 shadow-sm border bg-surface-secondary border-border-primary";
  const lbl = "text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5 block";

  const pendingInvites = invites.filter((i) => i.status === "pending");
  const historyInvites = invites.filter((i) => i.status !== "pending");
  const activeMentees = mentees.filter((m) => m.status === "active");
  const pausedMentees = mentees.filter((m) => m.status === "paused");
  const isSelf = (userId: string) => userId === user?.id;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between border-b border-border-primary pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Painel Admin</h1>
          <p className="text-xs mt-1 text-text-secondary">Controle de Acesso</p>
        </div>
      </div>

      {/* Feedback global */}
      {feedback && (
        <div
          className={cn(
            "p-3 rounded-lg text-sm flex items-center gap-2",
            feedback.type === "success"
              ? "bg-accent-green/10 text-accent-green border border-accent-green/20"
              : "bg-accent-red/10 text-accent-red border border-accent-red/20"
          )}
        >
          {feedback.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {feedback.msg}
        </div>
      )}

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
      </div>

      {/* Active Mentees */}
      <div className={cn(cd, "overflow-visible")}>
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users size={14} />
          Mentorados Ativos ({activeMentees.length})
        </h3>
        {loadingMentees ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-text-tertiary" />
          </div>
        ) : activeMentees.length === 0 ? (
          <p className="text-sm text-text-tertiary py-4 text-center">Nenhum mentorado ativo.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Email</th>
                <th className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Escola</th>
                <th className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Status</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Desde</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Ultimo acesso</th>
                <th className="w-16 text-right py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {activeMentees.map((m) => (
                <tr key={m.userId} className="border-b border-border-secondary/50 hover:bg-surface-tertiary/30 transition-colors">
                  <td className="py-3 px-3 text-text-primary text-xs font-medium">{m.email}</td>
                  <td className="py-3 px-3 text-text-secondary text-xs">{m.schools.join(", ") || "Sem escola"}</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-accent-green/10 text-accent-green">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                      Ativo
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-text-tertiary text-xs font-mono">{fmtDate(m.createdAt)}</td>
                  <td className="py-3 px-3 text-right text-text-tertiary text-xs font-mono">{fmtDate(m.lastSignIn)}</td>
                  <td className="py-3 px-3 text-right">
                    {isSelf(m.userId) ? (
                      <span className="text-[9px] text-text-tertiary italic">Voce</span>
                    ) : (
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === m.userId ? null : m.userId); }}
                          className="p-1.5 rounded-lg hover:bg-surface-tertiary transition-colors cursor-pointer bg-transparent border-none text-text-tertiary hover:text-text-primary"
                        >
                          {actionLoading === m.userId ? <Loader2 size={14} className="animate-spin" /> : <MoreVertical size={14} />}
                        </button>
                        {openMenu === m.userId && (
                          <div className="absolute right-0 top-full mt-1 z-[9999] bg-surface-secondary border border-border-primary rounded-lg shadow-xl py-1 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleMenteeAction("resend_access", m.userId)}
                              className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-surface-tertiary hover:text-accent-blue transition-colors flex items-center gap-2.5 cursor-pointer bg-transparent border-none"
                            >
                              <KeyRound size={13} /> Reenviar acesso / senha
                            </button>
                            <button
                              onClick={() => handleMenteeAction("pause", m.userId)}
                              className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-surface-tertiary hover:text-yellow-400 transition-colors flex items-center gap-2.5 cursor-pointer bg-transparent border-none"
                            >
                              <Pause size={13} /> Pausar acesso
                            </button>
                            {confirmDelete === m.userId ? (
                              <div className="px-4 py-3 space-y-2.5 border-t border-border-secondary">
                                <p className="text-[10px] text-accent-red font-semibold">Tem certeza? Todos os dados serao excluidos.</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleMenteeAction("delete", m.userId)}
                                    className="flex-1 px-2 py-1.5 rounded text-[10px] font-semibold bg-accent-red text-white hover:opacity-90 transition-opacity cursor-pointer border-none"
                                  >
                                    Excluir
                                  </button>
                                  <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="flex-1 px-2 py-1.5 rounded text-[10px] font-semibold bg-surface-tertiary text-text-secondary hover:opacity-90 transition-opacity cursor-pointer border-none"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(m.userId)}
                                className="w-full text-left px-4 py-2.5 text-xs text-accent-red hover:bg-accent-red/10 transition-colors flex items-center gap-2.5 cursor-pointer bg-transparent border-none"
                              >
                                <Trash2 size={13} /> Excluir mentorado
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paused Mentees */}
      {pausedMentees.length > 0 && (
        <div className={cd}>
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Pause size={14} />
            Mentorados Pausados ({pausedMentees.length})
          </h3>
          <div className="space-y-2">
            {pausedMentees.map((m) => (
              <div key={m.userId} className="flex items-center justify-between p-3 rounded-lg bg-surface-tertiary border border-border-secondary">
                <div>
                  <p className="text-xs font-medium text-text-primary">{m.email}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{m.schools.join(", ") || "Sem escola"} - Pausado</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMenteeAction("activate", m.userId)}
                    disabled={actionLoading === m.userId}
                    className="px-3 py-1.5 rounded-lg border border-accent-green/30 text-accent-green text-[10px] font-semibold hover:bg-accent-green/10 transition-colors cursor-pointer bg-transparent flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {actionLoading === m.userId ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                    Reativar
                  </button>
                  <button
                    onClick={() => {
                      if (confirmDelete === m.userId) {
                        handleMenteeAction("delete", m.userId);
                      } else {
                        setConfirmDelete(m.userId);
                      }
                    }}
                    disabled={actionLoading === m.userId}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer border flex items-center gap-1.5 disabled:opacity-40",
                      confirmDelete === m.userId
                        ? "bg-accent-red text-white border-accent-red"
                        : "bg-transparent border-accent-red/30 text-accent-red hover:bg-accent-red/10"
                    )}
                  >
                    {actionLoading === m.userId ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                    {confirmDelete === m.userId ? "Confirmar exclusao" : "Excluir"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
