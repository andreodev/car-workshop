type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({ label = "Carregando...", className }: LoadingStateProps) {
  return (
    <div className={className ?? "flex min-h-[60vh] items-center justify-center px-4"}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <span className="relative flex h-4 w-4">
          <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-primary/40" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
        </span>
        {label}
      </div>
    </div>
  );
}
