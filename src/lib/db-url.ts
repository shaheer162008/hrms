export const DEFAULT_SQLITE_URL = "file:./prisma/dev.db";

export function getTursoConfig() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url && !authToken) {
    return null;
  }

  if (!url || !authToken) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must both be set when using Turso.",
    );
  }

  return { url, authToken };
}

export function resolveDatabaseUrl(rawUrl?: string): string {
  const value = rawUrl?.trim();

  if (!value) {
    return DEFAULT_SQLITE_URL;
  }

  if (value.startsWith("file:") || value.startsWith("sqlite:")) {
    return value;
  }

  return DEFAULT_SQLITE_URL;
}
