import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { getTursoConfig, resolveDatabaseUrl } from "./db-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const tursoConfig = getTursoConfig();
const adapter = tursoConfig
  ? new PrismaLibSql({
      url: tursoConfig.url,
      authToken: tursoConfig.authToken,
    })
  : new PrismaBetterSqlite3({
      url: resolveDatabaseUrl(process.env.DATABASE_URL),
    });

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}