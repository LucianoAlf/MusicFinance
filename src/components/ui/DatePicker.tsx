import React, { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface DatePickerProps {
  value: string;       // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  dark?: boolean;
  className?: string;
}

function parseIso(v: string): Date | undefined {
  if (!v) return undefined;
  const d = parse(v, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  readOnly = false,
  dark = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const displayValue = selected ? format(selected, "dd/MM/yyyy") : "";

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    onChange(format(date, "yyyy-MM-dd"));
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  const triggerBase = cn(
    "flex w-full items-center gap-2 px-3 py-2.5 rounded-xl text-xs border-2",
    "focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all duration-150",
    "data-[state=open]:ring-2 data-[state=open]:ring-violet-500/50",
    (disabled || readOnly) && "opacity-50 cursor-not-allowed",
    dark
      ? "bg-slate-700 border-slate-600 text-white hover:border-slate-500"
      : "bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300",
    className
  );

  if (readOnly) {
    return (
      <div className={triggerBase}>
        <Calendar size={12} className={dark ? "text-slate-400 shrink-0" : "text-slate-400 shrink-0"} />
        <span className="flex-1 text-left">{displayValue || placeholder}</span>
      </div>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={triggerBase}
        >
          <Calendar size={12} className={dark ? "text-slate-400 shrink-0" : "text-slate-400 shrink-0"} />
          <span className={cn("flex-1 text-left", !displayValue && (dark ? "text-slate-500" : "text-slate-400"))}>
            {displayValue || placeholder}
          </span>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "shrink-0 p-0.5 rounded-full transition-colors",
                dark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <X size={10} />
            </button>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          align="start"
          className={cn(
            "z-[200] rounded-2xl border shadow-2xl p-3",
            "datepicker-content-animation",
            dark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          )}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ptBR}
            defaultMonth={selected ?? new Date()}
            modifiersClassNames={{
              selected: "!text-white",
            }}
            classNames={{
              root: cn("text-xs", dark ? "text-white" : "text-slate-900"),
              months: "flex flex-col",
              month: "space-y-2",
              month_caption: cn(
                "flex items-center justify-center py-1 text-xs font-semibold capitalize",
                dark ? "text-white" : "text-slate-900"
              ),
              nav: "flex items-center justify-between absolute inset-x-3 top-[14px]",
              button_previous: cn(
                "p-1 rounded-lg transition-colors border-none cursor-pointer",
                dark ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-slate-100"
              ),
              button_next: cn(
                "p-1 rounded-lg transition-colors border-none cursor-pointer",
                dark ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-slate-100"
              ),
              month_grid: "w-full border-collapse mt-1",
              weekdays: "flex",
              weekday: cn(
                "w-8 h-7 flex items-center justify-center text-[10px] font-semibold",
                dark ? "text-slate-500" : "text-slate-400"
              ),
              week: "flex w-full",
              day: "w-8 h-8 flex items-center justify-center",
              day_button: cn(
                "w-full h-full flex items-center justify-center rounded-lg text-[11px] font-medium",
                "cursor-pointer transition-colors border-none",
                dark
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-700 hover:bg-violet-50"
              ),
              selected: cn(
                dark ? "bg-violet-600 rounded-lg" : "bg-violet-600 rounded-lg"
              ),
              today: cn(
                "font-bold",
                dark ? "text-violet-400" : "text-violet-600"
              ),
              outside: "opacity-30",
              disabled: "opacity-20 cursor-not-allowed",
              hidden: "invisible",
            }}
          />
          <div className={cn("mt-2 pt-2 border-t flex justify-between", dark ? "border-slate-700" : "border-slate-100")}>
            <button
              type="button"
              onClick={() => { onChange(format(new Date(), "yyyy-MM-dd")); setOpen(false); }}
              className={cn(
                "text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors border-none cursor-pointer",
                dark ? "text-violet-400 hover:bg-slate-700" : "text-violet-600 hover:bg-violet-50"
              )}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                "text-[10px] font-medium px-2 py-1 rounded-lg transition-colors border-none cursor-pointer",
                dark ? "text-slate-400 hover:bg-slate-700" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              Fechar
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
