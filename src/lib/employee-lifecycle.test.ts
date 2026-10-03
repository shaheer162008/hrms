import { describe, expect, it } from "vitest";
import {
  canChangeEmployee,
  protectsLastSuperAdmin,
  wouldCreateManagerCycle,
} from "./employee-lifecycle";

describe("employee lifecycle permission rules", () => {
  it("keeps HR managers inside their subsidiary and prevents self-management", () => {
    expect(canChangeEmployee(
      { id: "hr", role: "HR_MANAGER", subsidiaryId: "dubai" },
      { id: "person", subsidiaryId: "dubai" },
    )).toBe(true);
    expect(canChangeEmployee(
      { id: "hr", role: "HR_MANAGER", subsidiaryId: "dubai" },
      { id: "hr", subsidiaryId: "dubai" },
    )).toBe(false);
    expect(canChangeEmployee(
      { id: "hr", role: "HR_MANAGER", subsidiaryId: "dubai" },
      { id: "person", subsidiaryId: "london" },
    )).toBe(false);
  });

  it("detects direct and indirect manager cycles", () => {
    const managers = new Map([["a", "b"], ["b", "c"], ["c", null]]);
    expect(wouldCreateManagerCycle("a", "a", managers)).toBe(true);
    expect(wouldCreateManagerCycle("c", "a", managers)).toBe(true);
    expect(wouldCreateManagerCycle("a", "c", managers)).toBe(false);
  });

  it("protects the last active super admin", () => {
    expect(protectsLastSuperAdmin("SUPER_ADMIN", "HR_MANAGER", 1)).toBe(true);
    expect(protectsLastSuperAdmin("SUPER_ADMIN", "HR_MANAGER", 2)).toBe(false);
    expect(protectsLastSuperAdmin("HR_MANAGER", "EMPLOYEE", 1)).toBe(false);
  });
});
