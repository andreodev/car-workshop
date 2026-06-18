import { Pool } from "pg";

const globalForPg = globalThis as unknown as {
  adminWorkshopPool?: Pool;
};

export const db =
  globalForPg.adminWorkshopPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.adminWorkshopPool = db;
}
