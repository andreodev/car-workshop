"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ToastVariant = "default" | "destructive" | "success";

type ToastOptions = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = ToastOptions & {
  id: string;
  duration: number;
};

type ToastContextValue = {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  toasts: ToastItem[];
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;

function createToastId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = React.useCallback(
    (options: ToastOptions) => {
      const id = createToastId();
      const duration = options.duration ?? DEFAULT_DURATION;

      setToasts((current) => [
        ...current,
        {
          id,
          duration,
          variant: options.variant ?? "default",
          title: options.title,
          description: options.description,
        },
      ]);

      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss]
  );

  const value = React.useMemo(
    () => ({ toast, dismiss, toasts }),
    [toast, dismiss, toasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }

  return context;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-foreground shadow-lg",
            toast.variant === "destructive" &&
              "border-destructive/40 bg-destructive/10 text-destructive",
            toast.variant === "success" &&
              "border-emerald-400/40 bg-emerald-500/10 text-emerald-700"
          )}
        >
          <div className="min-w-0 flex-1">
            {toast.title ? (
              <p className="text-sm font-semibold">{toast.title}</p>
            ) : null}
            {toast.description ? (
              <p
                className={cn(
                  "text-xs",
                  toast.variant === "default"
                    ? "text-muted-foreground"
                    : "text-current opacity-80"
                )}
              >
                {toast.description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onDismiss(toast.id)}
            className="-mt-1 h-7 w-7 shrink-0"
          >
            <X className="size-3.5" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
      ))}
    </div>
  );
}
