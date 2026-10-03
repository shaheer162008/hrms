ALTER TABLE "Employee" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN "terminatedAt" DATETIME;
ALTER TABLE "Employee" ADD COLUMN "terminationReason" TEXT;
UPDATE "Employee" SET "isActive" = false WHERE "status" = 'TERMINATED';

ALTER TABLE "EmployeeNotification" ADD COLUMN "leaveRequestId_tmp" TEXT;
ALTER TABLE "EmployeeNotification" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'GENERAL';
UPDATE "EmployeeNotification" SET "leaveRequestId_tmp" = "leaveRequestId";
-- SQLite cannot alter a required foreign-key column to optional in place.
CREATE TABLE "EmployeeNotification_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "leaveRequestId" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'GENERAL',
  "message" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" DATETIME,
  CONSTRAINT "EmployeeNotification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmployeeNotification_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "EmployeeNotification_new" ("id", "employeeId", "leaveRequestId", "kind", "message", "createdAt", "readAt")
SELECT "id", "employeeId", "leaveRequestId_tmp", "kind", "message", "createdAt", "readAt"
FROM "EmployeeNotification";
DROP TABLE "EmployeeNotification";
ALTER TABLE "EmployeeNotification_new" RENAME TO "EmployeeNotification";
CREATE INDEX "EmployeeNotification_employeeId_createdAt_idx" ON "EmployeeNotification"("employeeId", "createdAt");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorId" TEXT,
  "employeeId" TEXT,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AuditLog_employeeId_createdAt_idx" ON "AuditLog"("employeeId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
