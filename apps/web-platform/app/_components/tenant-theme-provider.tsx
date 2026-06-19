"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useQuery } from "@tanstack/react-query";

import {
  applyTenantThemeStyle,
  TENANT_THEME_CACHE_TTL_MS,
  tenantThemeCacheKey,
  type TenantThemeBranding,
} from "@/app/lib/tenant-theme";
import { AppBootLoading } from "@/components/ui/app-boot-loading";

type TenantThemeCache = {
  domain: string;
  branding: TenantThemeBranding;
  cachedAt: number;
};

type TenantThemeResponse = {
  id: string;
  name: string;
  slug: string;
  status: string;
  customDomain: string | null;
  customDomainVerifiedAt: string | null;
  branding: TenantThemeBranding;
};

type TenantThemeContextValue = {
  domain: string | null;
  branding: TenantThemeBranding | null;
  isLoading: boolean;
};

const TenantThemeContext = createContext<TenantThemeContextValue>({
  domain: null,
  branding: null,
  isLoading: false,
});

function getCurrentDomain() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location.hostname.toLowerCase();
}

function subscribeToThemeSnapshot() {
  return () => {};
}

function readCachedTheme(domain: string): TenantThemeCache | null {
  try {
    const raw = window.localStorage.getItem(tenantThemeCacheKey(domain));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<TenantThemeCache>;

    if (
      parsed.domain !== domain ||
      !parsed.branding ||
      typeof parsed.cachedAt !== "number"
    ) {
      return null;
    }

    return parsed as TenantThemeCache;
  } catch {
    return null;
  }
}

function isFresh(cache: TenantThemeCache | null) {
  return Boolean(
    cache && Date.now() - cache.cachedAt < TENANT_THEME_CACHE_TTL_MS
  );
}

function writeCachedTheme(domain: string, branding: TenantThemeBranding) {
  const cache: TenantThemeCache = {
    domain,
    branding,
    cachedAt: Date.now(),
  };

  window.localStorage.setItem(tenantThemeCacheKey(domain), JSON.stringify(cache));
}

async function fetchTenantTheme(domain: string) {
  const response = await fetch(
    `/api/tenants/getByDomain?domain=${encodeURIComponent(domain)}`,
    {
      headers: { Accept: "application/json" },
    }
  );

  if (response.status === 403 || response.status === 404) {
    window.localStorage.removeItem(tenantThemeCacheKey(domain));
    return null;
  }

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar as cores da oficina.");
  }

  const data = (await response.json()) as TenantThemeResponse;
  writeCachedTheme(domain, data.branding);

  return data;
}

export function TenantThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const domain = useSyncExternalStore(
    subscribeToThemeSnapshot,
    getCurrentDomain,
    () => null
  );
  const cachedTheme = useMemo(
    () => (domain ? readCachedTheme(domain) : null),
    [domain]
  );
  const freshCachedTheme = isFresh(cachedTheme) ? cachedTheme : null;

  useLayoutEffect(() => {
    if (freshCachedTheme?.branding) {
      applyTenantThemeStyle(document.documentElement, freshCachedTheme.branding);
    }
  }, [freshCachedTheme?.branding]);

  const shouldFetch = Boolean(domain && !freshCachedTheme);
  const themeQuery = useQuery({
    queryKey: ["tenant-theme", domain],
    queryFn: () => fetchTenantTheme(domain as string),
    enabled: shouldFetch,
    staleTime: TENANT_THEME_CACHE_TTL_MS,
    gcTime: TENANT_THEME_CACHE_TTL_MS,
    retry: false,
  });

  useLayoutEffect(() => {
    if (!domain || !themeQuery.data?.branding) {
      return;
    }

    applyTenantThemeStyle(document.documentElement, themeQuery.data.branding);
  }, [domain, themeQuery.data]);

  const value = useMemo<TenantThemeContextValue>(
    () => ({
      domain,
      branding: themeQuery.data?.branding ?? freshCachedTheme?.branding ?? null,
      isLoading: themeQuery.isLoading,
    }),
    [domain, freshCachedTheme?.branding, themeQuery.data?.branding, themeQuery.isLoading]
  );

  if (shouldFetch && themeQuery.isLoading) {
    return <AppBootLoading label="Carregando identidade..." />;
  }

  if (shouldFetch && themeQuery.data === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <section className="grid max-w-md gap-2 rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="font-heading text-xl font-semibold">Site não encontrado</h1>
          <p className="text-sm text-muted-foreground">
            Este domínio não está vinculado a uma oficina ativa.
          </p>
        </section>
      </main>
    );
  }

  return (
    <TenantThemeContext.Provider value={value}>
      {children}
    </TenantThemeContext.Provider>
  );
}

export function useTenantTheme() {
  return useContext(TenantThemeContext);
}
