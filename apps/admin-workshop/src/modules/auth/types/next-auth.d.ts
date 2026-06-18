import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    adminApiToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isOwner: boolean;
    };
  }

  interface User {
    isOwner: boolean;
    adminApiToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    isOwner?: boolean;
    adminApiToken?: string;
  }
}
