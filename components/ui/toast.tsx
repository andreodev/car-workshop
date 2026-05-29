"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ToastVariant = "default" | "destructive" | "success" | "warning";

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
      className="pointer-events-none fixed inset-x-3 top-4 z-[9999] flex flex-col gap-3 sm:left-auto sm:right-5 sm:top-5 sm:w-[420px]"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const isDestructive = toast.variant === "destructive";
  const isSuccess = toast.variant === "success";
  const isWarning = toast.variant === "warning";

  return (
    <div
      role={isDestructive ? "alert" : "status"}
      className={cn(
        "pointer-events-auto relative grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 overflow-hidden rounded-2xl border p-4 pr-3",
        "bg-white text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.20)] ring-1 ring-black/5",
        "animate-in fade-in slide-in-from-top-3 zoom-in-95 duration-300",
        "dark:bg-slate-950 dark:text-white dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)] dark:ring-white/10",
        isDestructive && "border-red-200 dark:border-red-900/70",
        isSuccess && "border-emerald-200 dark:border-emerald-900/70",
        isWarning && "border-amber-200 dark:border-amber-900/70",
        toast.variant === "default" && "border-slate-200 dark:border-slate-800"
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1.5",
          toast.variant === "default" && "bg-slate-900 dark:bg-slate-200",
          isDestructive && "bg-red-600",
          isSuccess && "bg-emerald-600",
          isWarning && "bg-amber-500"
        )}
      />

      <span
        className={cn(
          "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl",
          toast.variant === "default" &&
            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
          isDestructive &&
            "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
          isSuccess &&
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
          isWarning &&
            "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        )}
        aria-hidden="true"
      >
        {isDestructive ? (
          <AlertTriangle className="size-5" />
        ) : isSuccess ? (
          <CheckCircle2 className="size-5" />
        ) : isWarning ? (
          <AlertTriangle className="size-5" />
        ) : (
          <Info className="size-5" />
        )}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        {toast.title ? (
          <p className="text-sm font-bold leading-snug tracking-[-0.01em]">
            {toast.title}
          </p>
        ) : null}

        {toast.description ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {toast.description}
          </p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onDismiss(toast.id)}
        className="size-8 shrink-0 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <X className="size-4" />
        <span className="sr-only">Fechar</span>
      </Button>

      {toast.duration > 0 ? (
        <div
          className={cn(
            "absolute bottom-0 left-0 h-1 animate-[toast-progress_linear_forwards]",
            toast.variant === "default" && "bg-slate-900 dark:bg-slate-200",
            isDestructive && "bg-red-600",
            isSuccess && "bg-emerald-600",
            isWarning && "bg-amber-500"
          )}
          style={{
            width: "100%",
            animationDuration: `${toast.duration}ms`,
          }}
        />
      ) : null}
    </div>
  );
}