import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { db } from "@/lib/db";

const ADMIN_API_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  passwordHash: string | null;
  isOwner: boolean;
};

export function createAdminApiToken(userId: string) {
  const secret = process.env.ADMIN_JWT_SECRET;

  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET is required.");
  }

  return {
    token: jwt.sign({}, secret, {
      subject: userId,
      algorithm: "HS256",
      expiresIn: ADMIN_API_TOKEN_TTL_SECONDS,
    }),
    expiresAt: Date.now() + ADMIN_API_TOKEN_TTL_SECONDS * 1000,
  };
}

export async function authenticateOwner(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return null;
  }

  const result = await db.query<UserRow>(
    `
      SELECT
        u."id",
        u."name",
        u."email",
        u."image",
        u."passwordHash",
        EXISTS (
          SELECT 1 FROM "TenantUser" tu
          WHERE tu."userId" = u."id"
            AND tu."role" = 'OWNER'
            AND tu."isActive" = TRUE
        ) AS "isOwner"
      FROM "User" u
      WHERE u."email" = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

  const user = result.rows[0];

  if (!user?.passwordHash || !user.isOwner) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return null;
  }

  const adminApiToken = createAdminApiToken(user.id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    isOwner: true,
    adminApiToken: adminApiToken.token,
    adminApiTokenExpiresAt: adminApiToken.expiresAt,
  };
}
