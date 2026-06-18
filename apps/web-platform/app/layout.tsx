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

export const metadata = {
  title: "Rikinho Auto Center | Oficina Mecânica",
  description:
    "Oficina mecânica especializada em Manaus. Revisão, troca de óleo, suspensão, freios, alinhamento e balanceamento.",
  keywords: [
    "oficina mecânica",
    "auto center",
    "mecânico",
    "troca de óleo",
    "alinhamento",
    "balanceamento",
    "Manaus",
    "Rikinho Auto Center",
    "Caixa de marcha"
  ],
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