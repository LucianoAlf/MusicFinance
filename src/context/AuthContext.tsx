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
const MAX_INIT_MS = 10_000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchoolState] = useState<School | null>(null);

  const initDoneRef = useRef(false);

  const loadUserData = async (userId: string, email: string) => {
    const [saResult, tenantResult] = await Promise.allSettled([
      supabase.from("superadmins").select("user_id").eq("user_id", userId).maybeSingle(),
      supabase.from("tenant_users").select("tenant_id").eq("user_id", userId).limit(1).maybeSingle(),
    ]);

    const isSA = saResult.status === "fulfilled" && !!saResult.value.data;
    setIsSuperadmin(isSA);

    let tid: string | null = null;
    if (tenantResult.status === "fulfilled" && tenantResult.value.data) {
      tid = tenantResult.value.data.tenant_id;
    }

    if (!tid) {
      const { data: newTid } = await supabase.rpc("create_tenant_for_user", {
        p_name: email.split("@")[0],
        p_email: email,
      });
      tid = newTid;
    }

    setTenantId(tid);

    const { data: schoolData } = await supabase
      .from("schools")
      .select("id, tenant_id, name, year, default_tuition, passport_fee")
      .order("name");
    const list = (schoolData ?? []) as School[];
    setSchools(list);

    try {
      const raw = localStorage.getItem(SCHOOL_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as School;
        const match = list.find((s) => s.id === saved.id);
        if (match) {
          setSelectedSchoolState(match);
          return;
        }
      }
    } catch { /* corrupted localStorage */ }
    if (list.length === 1) {
      setSelectedSchoolState(list[0]);
      localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(list[0]));
    }
  };

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
    let cancelled = false;

    const safetyTimer = setTimeout(() => {
      if (!cancelled && loading) setLoading(false);
    }, MAX_INIT_MS);

    const init = async () => {
      if (initDoneRef.current) return;
      initDoneRef.current = true;

      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (cancelled) return;

        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          await loadUserData(s.user.id, s.user.email || "");
        }
      } catch {
        if (cancelled) return;
        setSession(null);
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (cancelled) return;
      if (event === "INITIAL_SESSION") return;

      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        await loadUserData(s.user.id, s.user.email || "");
      } else {
        setTenantId(null);
        setIsSuperadmin(false);
        setSchools([]);
        setSelectedSchoolState(null);
        localStorage.removeItem(SCHOOL_STORAGE_KEY);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
        await loadUserData(data.session.user.id, data.session.user.email || "");
      }
      return {};
    } catch {
      return { error: "Erro ao conectar. Tente novamente." };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setTenantId(null);
    setIsSuperadmin(false);
    setSchools([]);
    setSelectedSchoolState(null);
    localStorage.removeItem(SCHOOL_STORAGE_KEY);
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

  const refreshSchools = fetchSchools;

  return (
    <AuthContext.Provider
      value={{
        user, session, loading, tenantId, isSuperadmin, schools, selectedSchool,
        setSelectedSchool, signIn, signOut, createSchool, refreshSchools,
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
