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

const tenantThemeBootScript = `
(function () {
  try {
    var domain = window.location.hostname.toLowerCase();
    var cacheKey = "car-workshop:tenant-theme:" + domain;
    var cache = JSON.parse(window.localStorage.getItem(cacheKey) || "null");
    var ttl = 60 * 60 * 1000;

    if (!cache || cache.domain !== domain || !cache.branding || Date.now() - cache.cachedAt > ttl) {
      return;
    }

    function normalizeHexColor(value) {
      if (typeof value !== "string") return null;
      var trimmed = value.trim();
      if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
        return "#" + trimmed[1] + trimmed[1] + trimmed[2] + trimmed[2] + trimmed[3] + trimmed[3];
      }
      if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
      return null;
    }

    function readableForeground(background) {
      var color = normalizeHexColor(background);
      if (!color) return "#ffffff";
      var red = parseInt(color.slice(1, 3), 16) / 255;
      var green = parseInt(color.slice(3, 5), 16) / 255;
      var blue = parseInt(color.slice(5, 7), 16) / 255;
      function linear(channel) {
        return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
      }
      var luminance = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
      return luminance > 0.55 ? "#111111" : "#ffffff";
    }

    var root = document.documentElement;
    var primary = normalizeHexColor(cache.branding.primaryColor);
    var secondary = normalizeHexColor(cache.branding.secondaryColor);

    if (primary) {
      var primaryForeground = readableForeground(primary);
      root.style.setProperty("--primary", primary);
      root.style.setProperty("--primary-foreground", primaryForeground);
      root.style.setProperty("--ring", primary);
      root.style.setProperty("--sidebar-primary", primary);
      root.style.setProperty("--sidebar-primary-foreground", primaryForeground);
      root.style.setProperty("--chart-1", primary);
      root.style.setProperty("--chart-3", primary);
    }

    if (secondary) {
      var secondaryForeground = readableForeground(secondary);
      root.style.setProperty("--secondary", secondary);
      root.style.setProperty("--secondary-foreground", secondaryForeground);
      root.style.setProperty("--accent", secondary);
      root.style.setProperty("--accent-foreground", secondaryForeground);
      root.style.setProperty("--sidebar-accent", secondary);
      root.style.setProperty("--sidebar-accent-foreground", secondaryForeground);
      root.style.setProperty("--chart-2", secondary);
      root.style.setProperty("--chart-4", secondary);
    }
  } catch (_) {}
})();
`;

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

export default async function RootLayout({
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: tenantThemeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <div id="app-root" className="min-h-full flex flex-col">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
