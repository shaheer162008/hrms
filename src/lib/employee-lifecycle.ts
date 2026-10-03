import type { UserRole } from "@/lib/auth";

export const managedRoles: UserRole[] = [
  "SUPER_ADMIN",
  "HR_MANAGER",
  "DEPARTMENT_HEAD",
  "TEAM_LEAD",
  "EMPLOYEE",
];

export function isSuperAdmin(role: UserRole) {
  return role === "SUPER_ADMIN";
}

export function wouldCreateManagerCycle(
  employeeId: string,
  managerId: string | null,
  managers: Map<string, string | null>,
) {
  if (!managerId) return false;
  if (managerId === employeeId) return true;
  const visited = new Set<string>([employeeId]);
  let current: string | null = managerId;
  while (current) {
    if (visited.has(current)) return true;
    visited.add(current);
    current = managers.get(current) ?? null;
  }
  return false;
}

export function canChangeEmployee(
  actor: { id: string; role: UserRole; subsidiaryId: string | null },
  target: { id: string; subsidiaryId: string | null },
) {
  return actor.role === "SUPER_ADMIN" ||
    (actor.role === "HR_MANAGER" && actor.subsidiaryId === target.subsidiaryId && actor.id !== target.id);
}

export function protectsLastSuperAdmin(
  targetRole: UserRole,
  replacementRole: UserRole,
  activeSuperAdminCount: number,
) {
  return targetRole === "SUPER_ADMIN" &&
    replacementRole !== "SUPER_ADMIN" &&
    activeSuperAdminCount <= 1;
}
