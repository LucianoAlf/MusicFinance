import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

// ─── Modal (general) ──────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const sizeClass = {
  sm: "w-[min(20rem,calc(100vw-1.5rem))]",
  md: "w-[min(26.25rem,calc(100vw-1.5rem))]",
  lg: "w-[min(35rem,calc(100vw-1.5rem))]",
};

export function Modal({ open, onOpenChange, title, size = "md", children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "modal-content fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "rounded-xl p-6 focus:outline-none max-h-[90vh] overflow-y-auto",
            sizeClass[size],
            "bg-surface-secondary border border-border-primary shadow-2xl shadow-black/50"
          )}
        >
          {title ? (
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title
                className="text-base font-semibold text-text-primary"
              >
                {title}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="p-1 rounded-md border-none cursor-pointer transition-colors text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
          ) : (
            <VisuallyHidden>
              <Dialog.Title>Modal</Dialog.Title>
            </VisuallyHidden>
          )}
          <VisuallyHidden>
            <Dialog.Description>Conteúdo do modal</Dialog.Description>
          </VisuallyHidden>
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
}: ConfirmModalProps) {
  function handleConfirm() {
    onConfirm();
    onOpenChange(false);
  }

  const confirmBtnClass = cn(
    "flex-1 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer transition-all",
    variant === "danger" && "bg-accent-red text-surface-primary hover:opacity-90",
    variant === "warning" && "bg-accent-amber text-surface-primary hover:opacity-90",
    variant === "default" && "bg-[#181715] text-[#FAFAFA] hover:opacity-90"
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "modal-content fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "rounded-xl p-6 focus:outline-none w-80",
            "bg-surface-secondary border border-border-primary shadow-2xl shadow-black/50"
          )}
        >
          <div className="flex flex-col items-center text-center gap-3 mb-5">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              variant === "danger" && "bg-accent-red/10 text-accent-red",
              variant === "warning" && "bg-accent-amber/10 text-accent-amber",
              variant === "default" && "bg-accent-blue/10 text-accent-blue"
            )}>
              <AlertTriangle size={20} />
            </div>
            <Dialog.Title className="text-base font-semibold text-text-primary mb-1">
              {title}
            </Dialog.Title>
            <Dialog.Description className="text-xs text-text-secondary leading-relaxed">
              {message}
            </Dialog.Description>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium border-none cursor-pointer transition-all bg-surface-tertiary text-text-secondary hover:text-text-primary"
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
