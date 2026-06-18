"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { clearAccessToken, setAccessToken } from "@/shared/http/auth-token";

export function AdminAuthSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (session?.adminApiToken) {
      setAccessToken(session.adminApiToken);
      return;
    }

    clearAccessToken();
  }, [session?.adminApiToken, status]);

  return null;
}
