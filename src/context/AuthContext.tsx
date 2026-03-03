import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  schools: School[];
  selectedSchool: School | null;
  setSelectedSchool: (school: School) => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  createSchool: (name: string, tuition?: number, passport?: number, year?: number) => Promise<{ error?: string }>;
  refreshSchools: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SCHOOL_STORAGE_KEY = "musicfinance-selected-school";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchoolState] = useState<School | null>(null);

  const fetchTenantId = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", userId)
      .limit(1)
      .single();
    if (data) setTenantId(data.tenant_id);
    return data?.tenant_id ?? null;
  }, []);

  const fetchSchools = useCallback(async () => {
    const { data } = await supabase
      .from("schools")
      .select("id, tenant_id, name, year, default_tuition, passport_fee")
      .order("name");
    const list = (data ?? []) as School[];
    setSchools(list);
    return list;
  }, []);

  const setSelectedSchool = useCallback((school: School) => {
    setSelectedSchoolState(school);
    localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(school));
  }, []);

  const restoreSchool = useCallback((schoolList: School[]) => {
    try {
      const raw = localStorage.getItem(SCHOOL_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as School;
        const match = schoolList.find((s) => s.id === saved.id);
        if (match) {
          setSelectedSchoolState(match);
          return;
        }
      }
    } catch { /* ignore */ }
    if (schoolList.length === 1) {
      setSelectedSchool(schoolList[0]);
    }
  }, [setSelectedSchool]);

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        await fetchTenantId(s.user.id);
        const list = await fetchSchools();
        restoreSchool(list);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setTenantId(null);
        setSchools([]);
        setSelectedSchoolState(null);
        localStorage.removeItem(SCHOOL_STORAGE_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchTenantId, fetchSchools, restoreSchool]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      await fetchTenantId(u.id);
      const list = await fetchSchools();
      restoreSchool(list);
    }
    return {};
  };

  const signUp = async (name: string, email: string, password: string): Promise<{ error?: string }> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Erro ao criar conta." };

    const { data: tid, error: rpcError } = await supabase.rpc("create_tenant_for_user", {
      p_name: name,
      p_email: email,
    });
    if (rpcError) return { error: rpcError.message };

    setTenantId(tid);
    setSchools([]);
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setTenantId(null);
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
      .single();

    if (error) return { error: error.message };

    const list = await fetchSchools();
    if (school) setSelectedSchool(school as School);
    return {};
  };

  const refreshSchools = fetchSchools;

  return (
    <AuthContext.Provider
      value={{
        user, session, loading, tenantId, schools, selectedSchool,
        setSelectedSchool, signIn, signUp, signOut, createSchool, refreshSchools,
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
