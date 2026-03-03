import React, { createContext, useContext, useEffect, useState } from "react";
import { DashboardData } from "../types";
import { genData } from "../data/mockData";
import { MS, CCN, CCC } from "../lib/utils";

const SK = "dashfin-v2-react";

interface DataContextType {
  data: DashboardData | null;
  setData: React.Dispatch<React.SetStateAction<DashboardData | null>>;
  dark: boolean;
  setDark: React.Dispatch<React.SetStateAction<boolean>>;
  page: string;
  setPage: React.Dispatch<React.SetStateAction<string>>;
  sideCol: boolean;
  setSideCol: React.Dispatch<React.SetStateAction<boolean>>;
  curMo: number;
  setCurMo: React.Dispatch<React.SetStateAction<number>>;
  selProf: string | null;
  setSelProf: React.Dispatch<React.SetStateAction<string | null>>;
  selPay: string | null;
  setSelPay: React.Dispatch<React.SetStateAction<string | null>>;
  calcMo: (m: number) => any;
  saveStatus: "saving" | "saved" | "idle";
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState("dash");
  const [sideCol, setSideCol] = useState(false);
  const [curMo, setCurMo] = useState(new Date().getMonth());
  const [selProf, setSelProf] = useState<string | null>(null);
  const [selPay, setSelPay] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "idle">("idle");

  useEffect(() => {
    const load = () => {
      try {
        const r = localStorage.getItem(SK);
        if (r) {
          const parsed = JSON.parse(r);
          if (parsed.expenses && parsed.expenses.length > 0 && parsed.expenses[0].name === undefined) {
             parsed.expenses = parsed.expenses.map((e: any, i: number) => ({
               id: "cc" + (e.cc ?? i),
               name: CCN[e.cc ?? i] || "Outros",
               color: CCC[e.cc ?? i] || "#6b7280",
               items: e.items.map((it: any, j: number) => ({ ...it, id: it.id || `ei${i}-${j}` }))
             }));
          }
          if (!parsed.payableBills) {
            parsed.payableBills = [];
          }
          setData(parsed);
        } else {
          setData(genData());
        }
      } catch {
        setData(genData());
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (data) {
      setSaveStatus("saving");
      const timer = setTimeout(() => {
        localStorage.setItem(SK, JSON.stringify(data));
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [data]);

  useEffect(() => {
    if (dark) {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
  }, [dark]);

  const calcMo = (m: number) => {
    if (!data) return null;
    let tui = 0, pp = 0, ps = 0;
    (data.professors || []).forEach((p) => {
      let pay = 0;
      (p.students || []).forEach((s) => {
        const v = s.payments && s.payments[m];
        if (v && v > 0) {
          tui += v;
          pay++;
          ps++;
        }
      });
      pp += pay * p.costPerStudent;
    });
    const rv = data.revenue || ({} as any);
    const rev =
      tui +
      (rv.enrollments?.[m] || 0) +
      (rv.shop?.[m] || 0) +
      (rv.events?.[m] || 0) +
      (rv.interest?.[m] || 0) +
      (rv.other?.[m] || 0);
    let exp = pp,
      fc = 0,
      vc = pp;
    (data.expenses || []).forEach((cc) =>
      (cc.items || []).forEach((it) => {
        const a = it.amounts?.[m] || 0;
        exp += a;
        if (it.type === "F") fc += a;
        else vc += a;
      })
    );
    return {
      month: MS[m],
      revenue: rev,
      expenses: exp,
      profit: rev - exp,
      margin: rev > 0 ? (rev - exp) / rev : 0,
      tuition: tui,
      payingStudents: ps,
      profPayroll: pp,
      ticket: ps > 0 ? tui / ps : 0,
      fixedCost: fc,
      varCost: vc,
      costPerStudent: ps > 0 ? exp / ps : 0,
    };
  };

  if (!data) return null;

  return (
    <DataContext.Provider
      value={{
        data,
        setData,
        dark,
        setDark,
        page,
        setPage,
        sideCol,
        setSideCol,
        curMo,
        setCurMo,
        selProf,
        setSelProf,
        selPay,
        setSelPay,
        calcMo,
        saveStatus,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};
