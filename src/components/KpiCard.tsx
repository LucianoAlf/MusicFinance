import React from "react";
import { cn } from "../lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface KpiCardProps {
  icon?: React.ElementType; // Kept for backwards compatibility but not used
  label: string;
  value: string | number;
  color?: string; // Kept for backwards compatibility
  trend?: number | null;
  invertTrend?: boolean;
  sub?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, trend, invertTrend, sub }) => {
  const rawUp = trend != null && trend >= 0;
  const up = invertTrend ? !rawUp : rawUp;

  return (
    <div className="flex flex-col rounded-xl p-4 bg-surface-secondary border border-border-primary">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-text-secondary">{label}</p>
      </div>
      <div className="flex items-end gap-2 mb-1">
        <p className="text-2xl font-mono font-medium tracking-tight text-text-primary">
          {value}
        </p>
        {trend != null && (
          <span
            className={cn(
              "font-mono text-[11px] mb-1 flex items-center",
              up ? "text-accent-green" : "text-accent-red"
            )}
          >
            {up ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-text-tertiary">{sub}</p>}
    </div>
  );
};
