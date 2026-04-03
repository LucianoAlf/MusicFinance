import React from "react";
import { cn } from "../lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface KpiCardProps {
  icon?: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
  trend?: number | null;
  invertTrend?: boolean;
  sub?: string;
  note?: string;
  variant?: "default" | "hero";
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, trend, invertTrend, sub, note, variant = "default" }) => {
  const rawUp = trend != null && trend >= 0;
  const up = invertTrend ? !rawUp : rawUp;
  const isHero = variant === "hero";

  return (
    <div className={cn(
      "flex flex-col rounded-xl p-4 border",
      isHero
        ? "bg-[#0e1a14] border-[#1a3326]"
        : "bg-surface-secondary border-border-primary"
    )}>
      <div className="flex items-center justify-between mb-1">
        <p className={cn(
          "text-[10px] uppercase tracking-wider font-semibold",
          isHero ? "text-accent-green/60" : "text-text-secondary"
        )}>{label}</p>
      </div>
      <div className="flex items-end gap-2 mb-1">
        <p className={cn(
          "text-2xl font-mono font-medium tracking-tight",
          isHero ? "text-accent-green" : "text-text-primary"
        )}>
          {value}
        </p>
        {trend != null && (
          <span
            className={cn(
              "font-mono text-[11px] mb-1 flex items-center",
              isHero
                ? (up ? "text-accent-green/80" : "text-accent-red/80")
                : (up ? "text-accent-green" : "text-accent-red")
            )}
          >
            {up ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <p className={cn("text-xs", isHero ? "text-accent-green/50" : "text-text-tertiary")}>{sub}</p>}
      {note && <p className={cn("text-[11px] mt-1", isHero ? "text-accent-green/40" : "text-text-tertiary")}>{note}</p>}
    </div>
  );
};
