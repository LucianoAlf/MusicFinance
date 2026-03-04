import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

// ─── Modal (general) ──────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  dark?: boolean;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const sizeClass = {
  sm: "w-80",
  md: "w-[420px]",
  lg: "w-[560px]",
};

export function Modal({ open, onOpenChange, title, dark = false, size = "md", children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "modal-content fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl shadow-2xl p-6 focus:outline-none",
            sizeClass[size],
            dark ? "bg-slate-800" : "bg-white"
          )}
        >
          {title && (
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title
                className={cn("text-sm font-bold", dark ? "text-white" : "text-slate-900")}
              >
                {title}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className={cn(
                    "p-1 rounded-md border-none cursor-pointer transition-colors",
                    dark ? "text-slate-400 hover:bg-slate-700" : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "danger" | "warning" | "default";
  dark?: boolean;
}

export function ConfirmModal({
  open,
  onOpenChange,
  title = "Confirmar",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  variant = "danger",
  dark = false,
}: ConfirmModalProps) {
  function handleConfirm() {
    onConfirm();
    onOpenChange(false);
  }

  const confirmBtnClass = cn(
    "flex-1 py-2.5 rounded-xl text-xs font-bold shadow-sm border-none cursor-pointer transition-all",
    variant === "danger" && "bg-rose-500 hover:bg-rose-600 text-white",
    variant === "warning" && "bg-amber-500 hover:bg-amber-600 text-white",
    variant === "default" && "bg-violet-600 hover:bg-violet-700 text-white"
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "modal-content fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl shadow-2xl p-6 focus:outline-none w-80",
            dark ? "bg-slate-800" : "bg-white"
          )}
        >
          <div className="flex flex-col items-center text-center gap-3 mb-5">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              variant === "danger" && "bg-rose-100",
              variant === "warning" && "bg-amber-100",
              variant === "default" && "bg-violet-100"
            )}>
              <AlertTriangle
                size={20}
                className={cn(
                  variant === "danger" && "text-rose-500",
                  variant === "warning" && "text-amber-500",
                  variant === "default" && "text-violet-500"
                )}
              />
            </div>
            <Dialog.Title
              className={cn("text-sm font-bold", dark ? "text-white" : "text-slate-900")}
            >
              {title}
            </Dialog.Title>
            <p className={cn("text-xs leading-relaxed", dark ? "text-slate-400" : "text-slate-500")}>
              {message}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-medium border-none cursor-pointer transition-all",
                dark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {cancelLabel}
            </button>
            <button onClick={handleConfirm} className={confirmBtnClass}>
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── useConfirm hook ──────────────────────────────────────────────────────────

// Simple hook to manage a single ConfirmModal state
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    message: string;
    title?: string;
    confirmLabel?: string;
    variant?: "danger" | "warning" | "default";
    onConfirm: () => void;
  }>({
    open: false,
    message: "",
    onConfirm: () => {},
  });

  function confirm(opts: {
    message: string;
    title?: string;
    confirmLabel?: string;
    variant?: "danger" | "warning" | "default";
    onConfirm: () => void;
  }) {
    setState({ open: true, ...opts });
  }

  function close(open: boolean) {
    if (!open) setState((s) => ({ ...s, open: false }));
  }

  return { state, confirm, close };
}
