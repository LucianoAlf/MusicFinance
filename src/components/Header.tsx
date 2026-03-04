import React from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { CheckCircle, Loader2, LogOut, Moon, Sun } from "lucide-react";

export const Header = () => {
  const { dark, setDark, saveStatus } = useData();
  const { signOut, selectedSchool } = useAuth();

  return (
    <header
      className={cn(
        "h-14 flex items-center justify-between px-5 border-b backdrop-blur-sm sticky top-0 z-20",
        "bg-surface-primary/90 border-border-primary"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all font-medium",
            saveStatus === "saving"
              ? "bg-accent-amber/10 text-accent-amber"
              : "bg-accent-green/10 text-accent-green"
          )}
        >
          {saveStatus === "saving" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
          <span>{saveStatus === "saving" ? "Salvando..." : "Salvo"}</span>
        </span>
        {selectedSchool && (
          <span className="text-xs text-text-tertiary font-medium">
            {selectedSchool.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-lg transition-colors border-none cursor-pointer text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary bg-transparent"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={signOut}
          className="p-2 rounded-lg transition-colors border-none cursor-pointer text-text-tertiary hover:bg-surface-tertiary hover:text-accent-red bg-transparent"
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
