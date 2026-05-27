import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import Providers from "./providers";

import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rikinho Auto Center",
  description: "Gestão de Orçamentos e Serviços",
};

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