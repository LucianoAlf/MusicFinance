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
    "flex w-full items-center gap-2 px-3 py-2.5 rounded-lg text-xs border bg-surface-secondary border-border-secondary text-text-primary hover:border-border-hover",
    "focus:outline-none focus:ring-1 focus:ring-border-hover transition-all duration-150",
    (disabled || readOnly) && "opacity-50 cursor-not-allowed",
    className
  );

  if (readOnly) {
    return (
      <div className={triggerBase}>
        <Calendar size={12} className="text-text-tertiary shrink-0" />
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
          <Calendar size={12} className="text-text-tertiary shrink-0" />
          <span className={cn("flex-1 text-left", !displayValue && "text-text-tertiary")}>
            {displayValue || placeholder}
          </span>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 p-0.5 rounded-full transition-colors text-text-tertiary hover:text-text-primary"
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
            "z-[200] p-3 rounded-xl border shadow-xl shadow-black/20",
            "datepicker-content-animation",
            "bg-surface-secondary border-border-secondary"
          )}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ptBR}
            defaultMonth={selected ?? new Date()}
            modifiersClassNames={{
              selected: "!text-surface-primary",
            }}
            classNames={{
              root: "text-xs text-text-primary",
              months: "flex flex-col",
              month: "space-y-2",
              month_caption: "flex items-center justify-center py-1 text-xs font-semibold capitalize text-text-primary",
              nav: "flex items-center justify-between absolute inset-x-3 top-[14px]",
              button_previous: "p-1 rounded-lg transition-colors border-none cursor-pointer text-text-secondary hover:bg-surface-tertiary hover:text-text-primary bg-transparent [&>svg]:fill-current",
              button_next: "p-1 rounded-lg transition-colors border-none cursor-pointer text-text-secondary hover:bg-surface-tertiary hover:text-text-primary bg-transparent [&>svg]:fill-current",
              month_grid: "w-full border-collapse mt-1",
              weekdays: "flex",
              weekday: "w-8 h-7 flex items-center justify-center text-[10px] font-semibold text-text-tertiary",
              week: "flex w-full",
              day: "w-8 h-8 flex items-center justify-center",
              day_button: "w-full h-full flex items-center justify-center rounded-lg text-[11px] font-medium cursor-pointer transition-colors border-none bg-transparent text-text-primary hover:bg-surface-tertiary",
              selected: "bg-accent-blue rounded-lg font-bold text-surface-primary",
              today: "font-bold text-accent-blue",
              outside: "opacity-30 text-text-tertiary",
              disabled: "opacity-20 cursor-not-allowed",
              hidden: "invisible",
            }}
          />
          <div className="mt-2 pt-2 border-t flex justify-between border-border-secondary">
            <button
              type="button"
              onClick={() => { onChange(format(new Date(), "yyyy-MM-dd")); setOpen(false); }}
              className="text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors border-none cursor-pointer text-accent-blue hover:bg-surface-tertiary bg-transparent"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] font-medium px-2 py-1 rounded-lg transition-colors border-none cursor-pointer text-text-secondary hover:bg-surface-tertiary hover:text-text-primary bg-transparent"
            >
              Fechar
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
