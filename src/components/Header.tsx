import React from "react";
import { useData } from "../context/DataContext";
import { cn } from "../lib/utils";
import { CheckCircle, Loader2, Moon, Sun } from "lucide-react";

export const Header = () => {
  const { dark, setDark, saveStatus } = useData();

  return (
    <header
      className={cn(
        "h-12 flex items-center justify-between px-5 border-b backdrop-blur-sm sticky top-0 z-20",
        dark ? "border-slate-800 bg-slate-900/90" : "border-slate-100 bg-white/90"
      )}
    >
      <span
        className={cn(
          "text-[9px] px-2 py-1 rounded-full flex items-center gap-1 transition-all",
          saveStatus === "saving"
            ? dark
              ? "bg-amber-900/30 text-amber-400"
              : "bg-amber-50 text-amber-600"
            : dark
            ? "bg-emerald-900/30 text-emerald-400"
            : "bg-emerald-50 text-emerald-600"
        )}
      >
        {saveStatus === "saving" ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
        <span>{saveStatus === "saving" ? "Salvando..." : "Salvo"}</span>
      </span>
      <button
        onClick={() => setDark(!dark)}
        className={cn(
          "p-2 rounded-xl transition-all border-none cursor-pointer",
          dark
            ? "bg-slate-800 text-amber-400 hover:bg-slate-700"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
        )}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
};
