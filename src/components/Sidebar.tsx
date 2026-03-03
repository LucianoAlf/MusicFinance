import React from "react";
import { useData } from "../context/DataContext";
import { cn } from "../lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  TrendingUp,
  Settings,
  Music,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from "lucide-react";

export const Sidebar = () => {
  const { page, setPage, sideCol, setSideCol, dark } = useData();

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
        "h-screen flex flex-col transition-all duration-300 flex-shrink-0 border-r",
        sideCol ? "w-16" : "w-56",
        dark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      )}
    >
      <div
        className={cn(
          "h-14 flex items-center gap-2.5 border-b",
          sideCol ? "justify-center" : "px-4",
          dark ? "border-slate-800" : "border-slate-100"
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
          <Music size={16} />
        </div>
        {!sideCol && (
          <span className={cn("font-bold text-sm whitespace-nowrap", dark ? "text-white" : "text-slate-900")}>
            DashFinance
          </span>
        )}
      </div>
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setPage(it.id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border-none cursor-pointer text-left",
              page === it.id
                ? dark
                  ? "bg-violet-500/15 text-violet-400"
                  : "bg-violet-50 text-violet-700"
                : dark
                ? "text-slate-400 hover:text-white hover:bg-slate-800"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50",
              sideCol && "justify-center px-0"
            )}
            title={sideCol ? it.label : undefined}
          >
            <it.icon size={18} className="flex-shrink-0" />
            {!sideCol && <span>{it.label}</span>}
          </button>
        ))}
      </nav>
      <div className={cn("px-2 py-3 border-t", dark ? "border-slate-800" : "border-slate-100")}>
        <button
          onClick={() => setSideCol(!sideCol)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border-none cursor-pointer text-left",
            dark ? "text-slate-500 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-50",
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
