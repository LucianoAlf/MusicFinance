import React from "react";
import { MS, cn } from "../lib/utils";

interface MonthSelectorProps {
  curMo: number;
  setCurMo: (m: number) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ curMo, setCurMo }) => {
  return (
    <div className="flex gap-1 flex-wrap p-1 rounded-xl bg-surface-secondary border border-border-primary">
      {MS.map((m, i) => (
        <button
          key={m}
          onClick={() => setCurMo(i)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border-none cursor-pointer",
            curMo === i
              ? "bg-surface-tertiary text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50 bg-transparent"
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
};
