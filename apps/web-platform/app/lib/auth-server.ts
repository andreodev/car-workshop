import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
