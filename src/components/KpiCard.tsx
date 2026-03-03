import React from "react";
import { useData } from "../context/DataContext";
import { cn } from "../lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: "green" | "blue" | "purple" | "red" | "teal" | "orange" | "amber" | "cyan" | "rose";
  trend?: number | null;
  invertTrend?: boolean;
  sub?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ icon: Icon, label, value, color, trend, invertTrend, sub }) => {
  const { dark } = useData();

  const cs: Record<string, string> = {
    green: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-violet-500 to-violet-600",
    red: "from-rose-500 to-red-500",
    teal: "from-teal-500 to-cyan-500",
    orange: "from-orange-500 to-orange-600",
    amber: "from-amber-500 to-amber-600",
    cyan: "from-cyan-500 to-cyan-600",
    rose: "from-rose-400 to-pink-500",
  };

  const rawUp = trend != null && trend >= 0;
  const up = invertTrend ? !rawUp : rawUp;

  return (
    <div
      className={cn(
        "rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border",
        dark ? "bg-slate-800/80 border-slate-700/50" : "bg-white border-slate-100"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className={cn(
            "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg text-white",
            cs[color] || cs.blue
          )}
        >
          <Icon size={16} />
        </div>
        {trend != null && (
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5",
              up
                ? dark
                  ? "bg-emerald-900/30 text-emerald-400"
                  : "bg-emerald-50 text-emerald-600"
                : dark
                ? "bg-rose-900/30 text-rose-400"
                : "bg-rose-50 text-rose-600"
            )}
          >
            {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className={cn("text-lg font-bold tracking-tight", dark ? "text-white" : "text-slate-900")}>
        {value}
      </p>
      <p className={cn("text-[11px] mt-0.5", dark ? "text-slate-400" : "text-slate-500")}>{label}</p>
      {sub && <p className={cn("text-[10px]", dark ? "text-slate-500" : "text-slate-400")}>{sub}</p>}
    </div>
  );
};
