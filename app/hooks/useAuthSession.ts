"use client";

import { useQuery } from "@tanstack/react-query";

type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type SessionData = {
  user?: SessionUser;
  expires?: string;
} | null;

async function fetchSession(): Promise<SessionData> {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export function useAuthSession() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: fetchSession,
    staleTime: 60_000,
  });
}
