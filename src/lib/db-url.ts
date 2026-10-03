export const DEFAULT_SQLITE_URL = "file:./prisma/dev.db";

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
