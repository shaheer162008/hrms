import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "./db-url";

describe("resolveDatabaseUrl", () => {
  it("falls back to the local SQLite database for SQLite Cloud URLs", () => {
    const url = "sqlitecloud://cuxmhymrdk.g4.sqlite.cloud:8860/hrms.sqlite?apikey=test";

    expect(resolveDatabaseUrl(url)).toBe("file:./prisma/dev.db");
  });

  it("keeps a valid local SQLite URL unchanged", () => {
    expect(resolveDatabaseUrl("file:./prisma/dev.db")).toBe("file:./prisma/dev.db");
  });
});
