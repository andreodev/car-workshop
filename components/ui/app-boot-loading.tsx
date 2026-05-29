import { cn } from "@/lib/utils";

type AppBootLoadingProps = {
  label?: string;
  className?: string;
};

export function AppBootLoading({
  label = "Carregando...",
  className,
}: AppBootLoadingProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-[#0B0D12] px-6 text-white",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-[0_22px_60px_rgba(0,0,0,0.35)]">
          <span className="text-sm font-black text-red-400">RAC</span>
          <span className="absolute -inset-1 rounded-[20px] border border-red-500/20 border-t-red-400 animate-spin" />
        </div>

        <div>
          <p className="text-sm font-semibold">Rikinho Auto Center</p>
          <p className="mt-1 text-xs text-white/55">{label}</p>
        </div>
      </div>
    </div>
  );
}
