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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
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

  const checkSuperadmin = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("superadmins")
      .select("user_id")
      .eq("user_id", userId)
      .single();
    setIsSuperadmin(!!data);
    return !!data;
  }, []);

  const ensureTenantForInvitedUser = useCallback(async (userId: string, email: string) => {
    const tid = await fetchTenantId(userId);
    if (tid) return tid;

    const { data: newTid, error } = await supabase.rpc("create_tenant_for_user", {
      p_name: email.split("@")[0],
      p_email: email,
    });
    if (error) {
      console.error("Failed to create tenant for invited user:", error.message);
      return null;
    }
    setTenantId(newTid);
    return newTid;
  }, [fetchTenantId]);

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

  const initUser = useCallback(async (u: User) => {
    await checkSuperadmin(u.id);
    await ensureTenantForInvitedUser(u.id, u.email || "");
    const list = await fetchSchools();
    restoreSchool(list);
  }, [checkSuperadmin, ensureTenantForInvitedUser, fetchSchools, restoreSchool]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          await initUser(s.user);
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await initUser(s.user);
      } else {
        setTenantId(null);
        setIsSuperadmin(false);
        setSchools([]);
        setSelectedSchoolState(null);
        localStorage.removeItem(SCHOOL_STORAGE_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, [initUser]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      await initUser(u);
    }
    return {};
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
