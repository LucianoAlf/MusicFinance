import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  // Inicializar selectedSchool do localStorage SINCRONAMENTE para evitar flash
  const [selectedSchool, setSelectedSchoolState] = useState<School | null>(getStoredSchool);

  // Mutex para impedir execução paralela de loadUserData
  const loadingUserData = useRef(false);

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
      // OTIMIZAÇÃO: Buscar superadmin, tenant e schools em PARALELO
      // A RLS filtra schools automaticamente pelo tenant do usuário logado
      const [saResult, tenantResult, schoolsResult] = await Promise.allSettled([
        supabase.from("superadmins").select("user_id").eq("user_id", userId).maybeSingle(),
        supabase.from("tenant_users").select("tenant_id").eq("user_id", userId).maybeSingle(),
        supabase.from("schools")
          .select("id, tenant_id, name, year, default_tuition, passport_fee")
          .order("name"),
      ]);

      setIsSuperadmin(saResult.status === "fulfilled" && !!saResult.value.data);

      let tid: string | null = null;
      if (tenantResult.status === "fulfilled" && tenantResult.value.data) {
        tid = tenantResult.value.data.tenant_id;
      }
      setTenantId(tid);

      // Schools já veio em paralelo (RLS filtra por tenant)
      let list = (schoolsResult.status === "fulfilled"
        ? (schoolsResult.value.data ?? [])
        : []) as School[];

      // Se schools veio vazio mas tenant existe, pode ser race condition de RLS
      // Retry com filtro explícito de tenant_id
      if (list.length === 0 && tid) {
        const { data: retryData } = await supabase
          .from("schools")
          .select("id, tenant_id, name, year, default_tuition, passport_fee")
          .eq("tenant_id", tid)
          .order("name");
        list = (retryData ?? []) as School[];
      }

      setSchools(list);

      if (!tid) {
        // Sem tenant - manter selectedSchool do localStorage
        setDataLoaded(true);
        return;
      }

      // Validar escola do localStorage contra lista do servidor
      const stored = getStoredSchool();
      if (stored) {
        const match = list.find((s) => s.id === stored.id);
        if (match) {
          setSelectedSchoolState(match);
          setDataLoaded(true);
          return;
        }
      }

      // Auto-selecionar se só tem uma escola
      if (list.length === 1) {
        setSelectedSchoolState(list[0]);
        localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(list[0]));
      } else if (list.length === 0) {
        // CORREÇÃO 2: Não limpar selectedSchool se já existe no localStorage
        // Pode ser race condition de RLS - manter estado anterior
        const storedCheck = getStoredSchool();
        if (!storedCheck) {
          setSelectedSchoolState(null);
          localStorage.removeItem(SCHOOL_STORAGE_KEY);
        }
      }

      setDataLoaded(true);
    } catch (e) {
      console.error("[Auth] loadUserData error:", e);
      setDataLoaded(true); // Mesmo em erro, marcar como tentou carregar
    } finally {
      loadingUserData.current = false;
    }
  }, []);

  const setSelectedSchool = useCallback((school: School) => {
    setSelectedSchoolState(school);
    localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(school));
  }, []);

  const fetchSchools = useCallback(async (): Promise<School[]> => {
    const { data } = await supabase
      .from("schools")
      .select("id, tenant_id, name, year, default_tuition, passport_fee")
      .order("name");
    const list = (data ?? []) as School[];
    setSchools(list);
    return list;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Timeout de segurança - se init demorar mais de 8s, liberar loading
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("[Auth] Safety timeout - forcing loading=false");
        setLoading(false);
        setDataLoaded(true); // CRÍTICO: liberar também dataLoaded para evitar loading infinito
      }
    }, 8000);

    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          await loadUserData(s.user.id);
        }
      } catch (e) {
        console.error("[Auth] init error:", e);
        if (!mounted) return;
        setSession(null);
        setUser(null);
      } finally {
        clearTimeout(safetyTimeout);
        if (mounted) {
          setLoading(false);
          setDataLoaded(true); // SEMPRE liberar dataLoaded ao fim do init
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted || event === "INITIAL_SESSION") return;

      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        await loadUserData(s.user.id);
      } else {
        setTenantId(null);
        setIsSuperadmin(false);
        setSchools([]);
        setSelectedSchoolState(null);
        localStorage.removeItem(SCHOOL_STORAGE_KEY);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      if (data.session?.user) {
        // CARREGAR DADOS PRIMEIRO — antes de setar user no React
        // O supabase client já tem o token internamente após signInWithPassword
        await loadUserData(data.session.user.id);
        
        // SÓ DEPOIS setar user — AppRouter já terá schools e selectedSchool prontos
        setSession(data.session);
        setUser(data.session.user);
      }
      return {};
    } catch {
      return { error: "Erro ao conectar. Tente novamente." };
    }
  };

  const signOut = async () => {
    // Limpar estado local primeiro
    setUser(null);
    setSession(null);
    setTenantId(null);
    setIsSuperadmin(false);
    setSchools([]);
    setSelectedSchoolState(null);
    setDataLoaded(false);
    localStorage.removeItem(SCHOOL_STORAGE_KEY);
    localStorage.removeItem("musicfinance-auth");
    sessionStorage.removeItem("musicfinance-auth");

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
        user, session, loading, dataLoaded, tenantId, isSuperadmin, schools, selectedSchool,
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
