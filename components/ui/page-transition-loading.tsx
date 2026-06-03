"use client";

import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import Logo from "@/assets/logo/logo.png";
import { cn } from "@/lib/utils";

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function shouldShowLoading(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");

  if (!href || href.startsWith("#")) {
    return false;
  }

  if (
    anchor.target === "_blank" ||
    anchor.hasAttribute("download") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return false;
  }

  const url = new URL(anchor.href, window.location.href);

  if (url.origin !== window.location.origin) {
    return false;
  }

  return url.href !== window.location.href;
}

export function PageTransitionLoading() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const previousUrlRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const nextUrl = `${pathname}?${searchParams.toString()}`;

    if (previousUrlRef.current !== null && previousUrlRef.current !== nextUrl) {
      setIsLoading(false);
    }

    previousUrlRef.current = nextUrl;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 10_000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        isModifiedClick(event)
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest("a");

      if (anchor instanceof HTMLAnchorElement && shouldShowLoading(anchor)) {
        setIsLoading(true);
      }
    }

    function handlePageShow() {
      setIsLoading(false);
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-busy={isLoading}
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0D12]/92 px-6 text-white backdrop-blur-sm transition-opacity duration-200",
        isLoading
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      )}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10">
          <Image
            src={Logo}
            alt="Rikinho Auto Center"
            width={48}
            height={48}
            className="animate-pulse"
          />
          <span className="absolute -inset-1 rounded-[20px] border border-red-500/20 border-t-red-400 animate-spin" />
        </div>

        <div>
          <p className="text-sm font-semibold">Rikinho Auto Center</p>
          <p className="mt-1 text-xs text-white/55">Carregando pagina...</p>
        </div>
      </div>
    </div>
  );
}
