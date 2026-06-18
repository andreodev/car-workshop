import { Wrench } from "lucide-react";

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Wrench className="size-5" />
            </span>
            <div>
              <h1 className="font-heading text-2xl font-bold">Admin Workshop</h1>
              <p className="text-sm text-muted-foreground">
                Base modular conectada a API Golang.
              </p>
            </div>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
