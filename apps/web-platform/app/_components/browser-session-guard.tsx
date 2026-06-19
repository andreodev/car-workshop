"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

import { hasBrowserSession } from "@/app/lib/browser-session";
import { useTenantTheme } from "@/app/_components/tenant-theme-provider";
import { AppBootLoading } from "@/components/ui/app-boot-loading";

const AUTH_PATHS = new Set(["/login", "/signup"]);

export function BrowserSessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading: isThemeLoading } = useTenantTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isThemeLoading) {
      return;
    }

    let cancelled = false;

    async function clearStaleSession() {
      if (hasBrowserSession()) {
        if (!cancelled) {
          setIsReady(true);
        }
        return;
      }

      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok || cancelled) {
          if (!cancelled) {
            setIsReady(true);
          }
          return;
        }

        const session = await response.json();

        if (!session?.user || cancelled) {
          if (!cancelled) {
            setIsReady(true);
          }
          return;
        }

        const isAuthPath = AUTH_PATHS.has(pathname);

        if (isAuthPath) {
          await signOut({
            callbackUrl: "/login",
            redirect: false,
          });

          if (!cancelled) {
            setIsReady(true);
            router.refresh();
          }

          return;
        }

        await signOut({
          callbackUrl: "/login",
          redirect: true,
        });
      } catch {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    void clearStaleSession();

    return () => {
      cancelled = true;
    };
  }, [isThemeLoading, pathname, router]);

  if (isThemeLoading) {
    return <AppBootLoading label="Carregando identidade..." />;
  }

  if (!isReady) {
    return <AppBootLoading label="Verificando acesso..." />;
  }

  return <>{children}</>;
}
