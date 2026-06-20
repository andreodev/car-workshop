"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

import {
  ADMIN_AUTH_TOKEN_EXPIRED_EVENT,
  clearAccessToken,
  setAccessToken,
} from "@/shared/http/auth-token";

export function AdminAuthSync() {
  const { data: session, status, update } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (session?.adminApiToken) {
      setAccessToken(session.adminApiToken);
      return;
    }

    clearAccessToken();
  }, [session?.adminApiToken, status]);

  useEffect(() => {
    function refreshSessionToken() {
      void update();
    }

    window.addEventListener(ADMIN_AUTH_TOKEN_EXPIRED_EVENT, refreshSessionToken);
    return () => {
      window.removeEventListener(ADMIN_AUTH_TOKEN_EXPIRED_EVENT, refreshSessionToken);
    };
  }, [update]);

  return null;
}
