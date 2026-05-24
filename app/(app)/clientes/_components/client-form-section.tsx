"use client";

import type { ReactNode } from "react";

type ClientFormSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ClientFormSection({
  title,
  description,
  children,
}: ClientFormSectionProps) {
  return (
    <section className="space-y-5 border-t border-border/70 pt-8 first:border-t-0 first:pt-0">
      <div className="space-y-1">
        <h3 className="font-heading text-lg text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
