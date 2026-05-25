import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Car Workshop",
  description: "Gestao de orcamentos e servicos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        inter.variable,
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
