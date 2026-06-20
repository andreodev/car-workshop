import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { authenticateOwner, createAdminApiToken } from "./admin-auth";

const ADMIN_API_TOKEN_REFRESH_WINDOW_MS = 60 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.isOwner = user.isOwner;
        token.adminApiToken = user.adminApiToken;
        token.adminApiTokenExpiresAt = user.adminApiTokenExpiresAt;
      }

      if (
        token.userId &&
        token.isOwner &&
        (!token.adminApiTokenExpiresAt ||
          Date.now() > token.adminApiTokenExpiresAt - ADMIN_API_TOKEN_REFRESH_WINDOW_MS)
      ) {
        const adminApiToken = createAdminApiToken(token.userId);
        token.adminApiToken = adminApiToken.token;
        token.adminApiTokenExpiresAt = adminApiToken.expiresAt;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? "";
        session.user.isOwner = Boolean(token.isOwner);
      }

      session.adminApiToken = token.adminApiToken;
      session.adminApiTokenExpiresAt = token.adminApiTokenExpiresAt;

      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "Owner",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const user = await authenticateOwner(
          credentials?.email ?? "",
          credentials?.password ?? ""
        );

        return user;
      },
    }),
  ],
};
