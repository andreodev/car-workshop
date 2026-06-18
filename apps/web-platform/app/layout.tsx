import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import Providers from "./providers";

import { cn } from "@/lib/utils";
import { fallbackBranding, getCurrentTenantBranding } from "@/app/lib/tenant-branding";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getCurrentTenantBranding();
  const title = `${branding.title} | Oficina Mecânica`;

  return {
    title,
    description:
      "Gestao inteligente para oficinas mecanicas, clientes, veiculos, ordens de servico e financeiro.",
    keywords: [
      "oficina mecanica",
      "auto center",
      "mecanico",
      "troca de oleo",
      "alinhamento",
      "balanceamento",
      branding.title,
      fallbackBranding.title,
    ],
    icons: branding.logoUrl
      ? {
          icon: branding.logoUrl,
          shortcut: branding.logoUrl,
          apple: branding.logoUrl,
        }
      : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        inter.variable,
        inter.className,
        "font-sans"
      )}
    >
      <body className="min-h-full flex flex-col">
        <div id="app-root" className="min-h-full flex flex-col">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
