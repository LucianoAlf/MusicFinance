import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { markPasswordSet } from "../components/SetPasswordModal";

export interface School {
  id: string;
  tenant_id: string;
  name: string;
  year: number;
  default_tuition: number;
  passport_fee: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** true quando loadUserData terminou (sucesso ou erro) */
  dataLoaded: boolean;
  tenantId: string | null;
  isSuperadmin: boolean;
  schools: School[];
  schoolsLoaded: boolean;
  selectedSchool: School | null;
  setSelectedSchool: (school: School) => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  createSchool: (name: string, tuition?: number, passport?: number, year?: number) => Promise<{ error?: string }>;
  refreshSchools: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SCHOOL_STORAGE_KEY = "musicfinance-selected-school";

/** Lê escola do localStorage de forma síncrona */
function getStoredSchool(): School | null {
  try {
    const raw = localStorage.getItem(SCHOOL_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as School;
  } catch { /* corrupted */ }
  return null;
}

/** Verifica se existe sessão no localStorage (leitura síncrona) */
function hasStoredSession(): boolean {
  try {
    const raw = localStorage.getItem("musicfinance-auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      return !!(parsed?.access_token || parsed?.user);
    }
  } catch { /* corrupted */ }
  return false;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Se não tem sessão no localStorage, não precisa de spinner — Login aparece direto
  const [loading, setLoading] = useState(hasStoredSession);
  const [dataLoaded, setDataLoaded] = useState(!hasStoredSession());
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoaded, setSchoolsLoaded] = useState(false);
  // Inicializar selectedSchool do localStorage SINCRONAMENTE para evitar flash
  const [selectedSchool, setSelectedSchoolState] = useState<School | null>(getStoredSchool);

  // Mutex para impedir execução paralela de loadUserData
  const loadingUserData = useRef(false);
  // Flag para bloquear onAuthStateChange durante signIn
  const signingIn = useRef(false);

  const validateSelectedSchool = useCallback((list: School[]) => {
    const stored = getStoredSchool();
    if (stored) {
      const match = list.find((s) => s.id === stored.id);
      if (match) {
        setSelectedSchoolState(match);
        localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(match));
        return;
      }
    }

    if (list.length === 1) {
      setSelectedSchoolState(list[0]);
      localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(list[0]));
      return;
    }

    if (list.length === 0) {
      setSelectedSchoolState(null);
      localStorage.removeItem(SCHOOL_STORAGE_KEY);
      return;
    }

    if (stored) {
      setSelectedSchoolState(null);
      localStorage.removeItem(SCHOOL_STORAGE_KEY);
    }
  }, []);

  const fetchSchoolsForTenant = useCallback(async (tid: string) => {
    setSchoolsLoaded(false);
    try {
      const { data } = await supabase
        .from("schools")
        .select("id, tenant_id, name, year, default_tuition, passport_fee")
        .eq("tenant_id", tid)
        .order("name");

      const list = (data ?? []) as School[];
      setSchools(list);
      validateSelectedSchool(list);
    } catch (e) {
      console.error("[Auth] fetchSchoolsForTenant error:", e);
      setSchools([]);
    } finally {
      setSchoolsLoaded(true);
    }
  }, [validateSelectedSchool]);

  const loadUserData = useCallback(async (userId: string) => {
    // Mutex: se já está carregando, aguardar a conclusão em vez de retornar silenciosamente
    if (loadingUserData.current) {
      // Aguardar a chamada em andamento terminar (poll simples)
      let waited = 0;
      while (loadingUserData.current && waited < 5000) {
        await new Promise(r => setTimeout(r, 100));
        waited += 100;
      }
      return; // A chamada anterior já setou dataLoaded
    }
    loadingUserData.current = true;

    try {
      // Buscar apenas superadmin + tenant durante auth.
      // Schools carrega em background para não bloquear a navegação inicial.
      const [saResult, tenantResult] = await Promise.allSettled([
        supabase.from("superadmins").select("user_id").eq("user_id", userId).maybeSingle(),
        supabase.from("tenant_users").select("tenant_id").eq("user_id", userId).maybeSingle(),
      ]);

      setIsSuperadmin(saResult.status === "fulfilled" && !!saResult.value.data);

      let tid: string | null = null;
      if (tenantResult.status === "fulfilled" && tenantResult.value.data) {
        tid = tenantResult.value.data.tenant_id;
      }
      setTenantId(tid);

      if (!tid) {
        setSchools([]);
        setSchoolsLoaded(true);
        setDataLoaded(true);
        return;
      }

      setSchoolsLoaded(false);
      setDataLoaded(true);
      void fetchSchoolsForTenant(tid);
    } catch (e) {
      console.error("[Auth] loadUserData error:", e);
      setDataLoaded(true); // Mesmo em erro, marcar como tentou carregar
    } finally {
      loadingUserData.current = false;
    }
  }, [fetchSchoolsForTenant]);

  const setSelectedSchool = useCallback((school: School) => {
    setSelectedSchoolState(school);
    localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(school));
  }, []);

  const fetchSchools = useCallback(async (): Promise<School[]> => {
    setSchoolsLoaded(false);
    const { data } = await supabase
      .from("schools")
      .select("id, tenant_id, name, year, default_tuition, passport_fee")
      .order("name");
    const list = (data ?? []) as School[];
    setSchools(list);
    setSchoolsLoaded(true);
    validateSelectedSchool(list);
    return list;
  }, [validateSelectedSchool]);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: se INITIAL_SESSION não disparar em 5s,
    // desbloqueia UI (mostra Login). NÃO limpar localStorage — se o token
    // refresh completar depois, INITIAL_SESSION vai setar o user normalmente.
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        console.warn("[Auth] INITIAL_SESSION timeout — unblocking UI");
        setLoading(false);
        setDataLoaded(true);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;

      if (event === "INITIAL_SESSION") {
        clearTimeout(safetyTimer);
        if (s?.user) {
          setSession(s);
          setUser(s.user);
          void loadUserData(s.user.id);
        } else {
          setDataLoaded(true);
        }
        setLoading(false);
        return;
      }

      // Ignorar eventos durante signIn (controlado manualmente)
      if (signingIn.current) return;

      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setTenantId(null);
        setIsSuperadmin(false);
        setSchools([]);
        setSchoolsLoaded(true);
        setSelectedSchoolState(null);
        setDataLoaded(false);
        localStorage.removeItem(SCHOOL_STORAGE_KEY);
        return;
      }

      // TOKEN_REFRESHED, SIGNED_IN, USER_UPDATED
      if (s?.user) {
        setSession(s);
        setUser(s.user);
        if (event === "SIGNED_IN") {
          await loadUserData(s.user.id);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    signingIn.current = true; // BLOQUEAR listener durante signIn
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        signingIn.current = false;
        return { error: error.message };
      }

      if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
        markPasswordSet(data.session.user.id);
        await loadUserData(data.session.user.id);
      }
      return {};
    } catch {
      return { error: "Erro ao conectar. Tente novamente." };
    } finally {
      // Dar 500ms para o onAuthStateChange ter sido ignorado antes de liberar
      setTimeout(() => { signingIn.current = false; }, 500);
    }
  };

  const signOut = async () => {
    // Limpar estado local primeiro
    setUser(null);
    setSession(null);
    setTenantId(null);
    setIsSuperadmin(false);
    setSchools([]);
    setSchoolsLoaded(false);
    setSelectedSchoolState(null);
    setDataLoaded(false);
    localStorage.removeItem(SCHOOL_STORAGE_KEY);

    try {
      // Usar scope: "local" - "global" requer service_role key e retorna 403 com anon key
      await supabase.auth.signOut({ scope: "local" });
    } catch { /* ignore */ }

    // Forçar reload para garantir estado limpo no Chrome
    window.location.href = "/";
  };

  const createSchool = async (
    name: string,
    tuition = 350,
    passport = 350,
    year = new Date().getFullYear()
  ): Promise<{ error?: string }> => {
    if (!tenantId) return { error: "Tenant nao encontrado." };

    const { data: school, error } = await supabase
      .from("schools")
      .insert({ tenant_id: tenantId, name, default_tuition: tuition, passport_fee: passport, year })
      .select("id, tenant_id, name, year, default_tuition, passport_fee")
      .maybeSingle();

    if (error) return { error: error.message };

    await fetchSchools();
    if (school) setSelectedSchool(school as School);
    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, loading, dataLoaded, tenantId, isSuperadmin, schools, schoolsLoaded, selectedSchool,
        setSelectedSchool, signIn, signOut, createSchool, refreshSchools: fetchSchools,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
