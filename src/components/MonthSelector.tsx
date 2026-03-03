import React from "react";
import { useData } from "../context/DataContext";
import { MS, cn } from "../lib/utils";

interface MonthSelectorProps {
  curMo: number;
  setCurMo: (m: number) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ curMo, setCurMo }) => {
  const { dark } = useData();

  return (
    <div className="flex gap-0.5 flex-wrap">
      {MS.map((m, i) => (
        <button
          key={m}
          onClick={() => setCurMo(i)}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border-none cursor-pointer",
            curMo === i
              ? "bg-violet-600 text-white shadow-md"
              : dark
              ? "text-slate-400 hover:bg-slate-700 bg-transparent"
              : "text-slate-500 hover:bg-slate-100 bg-transparent"
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
};
