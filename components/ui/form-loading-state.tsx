import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type FormLoadingStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function FormLoadingState({
  title = "Carregando cadastro...",
  description = "Aguardando buscar as informações necessárias.",
  className,
}: FormLoadingStateProps) {
  return (
    <section
      className={cn(
        "flex min-h-[calc(100vh-8rem)] w-full items-center justify-center px-4",
        className
      )}
    >
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-lg border border-border bg-card px-6 py-7 text-center shadow-sm">
        <Spinner size="lg" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </section>
  );
}
