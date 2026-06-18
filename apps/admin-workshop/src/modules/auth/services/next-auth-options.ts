import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { authenticateOwner } from "./admin-auth";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
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
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? "";
        session.user.isOwner = Boolean(token.isOwner);
      }

      session.adminApiToken = token.adminApiToken;

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
