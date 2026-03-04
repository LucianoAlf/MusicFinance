import React from "react";
import { useData } from "../context/DataContext";
import { cn } from "../lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from "lucide-react";

export const Sidebar = () => {
  const { page, setPage, sideCol, setSideCol } = useData();

  const items = [
    { id: "dash", icon: LayoutDashboard, label: "Dashboard" },
    { id: "profs", icon: Users, label: "Professores" },
    { id: "monthly", icon: Calendar, label: "Financeiro" },
    { id: "payables", icon: Receipt, label: "Contas a Pagar" },
    { id: "dre", icon: TrendingUp, label: "DRE Anual" },
    { id: "config", icon: Settings, label: "Configurações" },
  ];

  return (
    <aside
      className={cn(
        "h-screen flex flex-col transition-all duration-300 flex-shrink-0 border-r border-border-primary bg-surface-primary",
        sideCol ? "w-16" : "w-56"
      )}
    >
      <div
        className={cn(
          "h-14 flex items-center gap-3 border-b border-border-primary",
          sideCol ? "justify-center" : "px-5"
        )}
      >
        <div className="flex items-center justify-center flex-shrink-0">
          <img src="/porquinho.png" alt="Logo" className="w-7 h-7" />
        </div>
        {!sideCol && (
          <span className="font-logo text-[18px] font-extrabold tracking-tighter text-text-primary">
            MusicFinance
          </span>
        )}
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setPage(it.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all border-none cursor-pointer text-left",
              page === it.id
                ? "bg-surface-tertiary text-text-primary shadow-sm font-semibold"
                : "text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50",
              sideCol && "justify-center px-0"
            )}
            title={sideCol ? it.label : undefined}
          >
            <it.icon size={16} strokeWidth={page === it.id ? 2.5 : 2} className="flex-shrink-0" />
            {!sideCol && <span>{it.label}</span>}
          </button>
        ))}
      </nav>
      <div className="px-2 py-3 border-t border-border-primary">
        <button
          onClick={() => setSideCol(!sideCol)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all border-none cursor-pointer text-left text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary",
            sideCol && "justify-center px-0"
          )}
        >
          {sideCol ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!sideCol && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
};
