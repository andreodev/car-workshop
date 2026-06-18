import { getServerSession } from "next-auth";

import { authOptions } from "./next-auth-options";

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
