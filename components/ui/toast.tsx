"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

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
      className="pointer-events-none fixed inset-x-3 top-3 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:top-4 sm:w-96"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.variant === "destructive" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 overflow-hidden rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl shadow-black/10 ring-1 ring-black/5",
            toast.variant === "destructive" &&
              "border-destructive/30 bg-destructive/10 text-destructive ring-destructive/10",
            toast.variant === "success" &&
              "border-emerald-500/30 bg-emerald-50 text-emerald-800 ring-emerald-500/10"
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground",
              toast.variant === "destructive" && "bg-destructive/10 text-destructive",
              toast.variant === "success" && "bg-emerald-100 text-emerald-700"
            )}
            aria-hidden="true"
          >
            {toast.variant === "destructive" ? (
              <AlertTriangle className="size-4" />
            ) : toast.variant === "success" ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Info className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            {toast.title ? (
              <p className="text-sm font-semibold leading-snug">{toast.title}</p>
            ) : null}
            {toast.description ? (
              <p
                className={cn(
                  "mt-1 text-xs leading-relaxed",
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
            className="-mr-1 -mt-1 size-7 shrink-0 text-current opacity-70 hover:opacity-100"
          >
            <X className="size-3.5" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
      ))}
    </div>
  );
}
