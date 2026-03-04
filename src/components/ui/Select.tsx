import React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  color?: string; // Tailwind bg+text classes, e.g. "bg-emerald-100 text-emerald-700"
}

interface SelectProps {
  value: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  dark?: boolean;
  compact?: boolean;
  className?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Selecione...",
  disabled = false,
  dark = false,
  compact = false,
  className,
}: SelectProps) {
  const selected = options.find((o) => o.value === value);

  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger
        className={cn(
          "flex items-center transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-violet-500/50",
          disabled && "opacity-50 cursor-not-allowed",
          compact
            ? "justify-start gap-0 px-0 py-0 rounded-full border-0 bg-transparent cursor-pointer"
            : cn(
                "w-full justify-between gap-2 px-3 py-2.5 rounded-xl text-xs border-2",
                "data-[state=open]:ring-2 data-[state=open]:ring-violet-500/50",
                dark
                  ? "bg-slate-700 border-slate-600 text-white hover:border-slate-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300"
              ),
          className
        )}
      >
        <div className={cn("flex items-center min-w-0", compact ? "gap-0" : "gap-1.5")}>
          {selected?.color ? (
            <span className={cn(
              "rounded-full font-semibold truncate",
              compact ? "px-2 py-0.5 text-[10px] hover:opacity-80 transition-opacity" : "px-1.5 py-0.5 text-[10px]",
              selected.color
            )}>
              {selected.label}
            </span>
          ) : (
            <RadixSelect.Value placeholder={placeholder}>
              {selected ? selected.label : placeholder}
            </RadixSelect.Value>
          )}
        </div>
        {!compact && (
          <RadixSelect.Icon asChild>
            <ChevronDown
              size={12}
              className={cn(
                "shrink-0 transition-transform duration-200",
                dark ? "text-slate-400" : "text-slate-500",
                "group-data-[state=open]:rotate-180"
              )}
            />
          </RadixSelect.Icon>
        )}
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "z-[200] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border shadow-xl",
            "select-content-animation",
            dark
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-200"
          )}
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer",
                  "select-none outline-none transition-colors duration-100",
                  dark
                    ? "text-white hover:bg-slate-700 data-[highlighted]:bg-slate-700 data-[state=checked]:bg-slate-700"
                    : "text-slate-800 hover:bg-slate-50 data-[highlighted]:bg-slate-50 data-[state=checked]:bg-violet-50"
                )}
              >
                <RadixSelect.ItemText>
                  {opt.color ? (
                    <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold", opt.color)}>
                      {opt.label}
                    </span>
                  ) : (
                    <span className="font-medium">{opt.label}</span>
                  )}
                </RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={11} className={dark ? "text-violet-400" : "text-violet-600"} />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
