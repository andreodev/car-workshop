"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PageTransitionLoadingProps = {
  primaryColor?: string;
};

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function shouldShowLoading(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");

  if (!href || href.startsWith("#")) return false;

  if (
    anchor.target === "_blank" ||
    anchor.hasAttribute("download") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return false;
  }

  const url = new URL(anchor.href, window.location.href);

  return (
    url.origin === window.location.origin && url.href !== window.location.href
  );
}

export function PageTransitionLoading({
  primaryColor = "#ef4444",
}: PageTransitionLoadingProps) {
  const pathname = usePathname();

  const [isLoading, setIsLoading] = useState(false);
  const previousPathRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (
      previousPathRef.current !== null &&
      previousPathRef.current !== pathname
    ) {
      setIsLoading(false);
    }

    previousPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isLoading) return;

    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 10_000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
    <AnimatePresence>
      {isLoading && (
        <motion.div
          aria-live="polite"
          aria-busy={isLoading}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/20 backdrop-blur-md"
            initial={{ backdropFilter: "blur(0px)" }}
            animate={{ backdropFilter: "blur(8px)" }}
            exit={{ backdropFilter: "blur(0px)" }}
          />

          <motion.div
            className="relative flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-8 py-6 shadow-2xl backdrop-blur-xl"
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
          >
            <div className="relative h-12 w-12">
              <motion.div
                className="absolute inset-0 rounded-full border-2 opacity-20"
                style={{ borderColor: primaryColor }}
              />

              <motion.div
                className="absolute inset-0 rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: primaryColor,
                  borderRightColor: primaryColor,
                }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-white">Carregando</p>

              <motion.p
                className="mt-1 text-xs text-white/60"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              >
                Aguarde um instante...
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}