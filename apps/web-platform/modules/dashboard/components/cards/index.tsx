import Link from "next/link";
import type { ComponentType } from "react";

const integerFormatter = new Intl.NumberFormat("pt-BR");

function formatInteger(value: number) {
  return integerFormatter.format(value);
}

export function CardMetric({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-24 flex-col justify-between rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
    >
      <Icon className="size-4 text-primary" />
      <span>
        <strong className="block font-heading text-xl">{formatInteger(value)}</strong>
        <span className="text-xs text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}