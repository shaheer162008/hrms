import { describe, expect, it } from "vitest";
import {
  countBusinessLeaveDays,
  countInclusiveLeaveDays,
  requiresDepartmentHeadApproval,
} from "./leave-workflow";

describe("leave approval rules", () => {
  it("counts both ends of a leave range", () => {
    expect(
      countInclusiveLeaveDays(
        new Date("2026-06-10T00:00:00.000Z"),
        new Date("2026-06-14T23:59:59.000Z"),
      ),
    ).toBe(5);
  });

  it("rejects a reversed date range", () => {
    expect(() =>
      countInclusiveLeaveDays(
        new Date("2026-06-15T00:00:00.000Z"),
        new Date("2026-06-14T00:00:00.000Z"),
      ),
    ).toThrow(RangeError);
  });

  it("counts weekdays and excludes weekend and holiday dates", () => {
    expect(
      countBusinessLeaveDays(
        new Date("2026-11-02T00:00:00.000Z"),
        new Date("2026-11-08T00:00:00.000Z"),
      ),
    ).toBe(5);
    expect(
      countBusinessLeaveDays(
        new Date("2026-11-07T00:00:00.000Z"),
        new Date("2026-11-08T00:00:00.000Z"),
      ),
    ).toBe(0);
    expect(
      countBusinessLeaveDays(
        new Date("2026-12-01T00:00:00.000Z"),
        new Date("2026-12-03T00:00:00.000Z"),
        [new Date("2026-12-02T00:00:00.000Z")],
      ),
    ).toBe(2);
  });

  it("escalates only above the configured threshold unless the type requires it", () => {
    expect(requiresDepartmentHeadApproval(3, 3, false)).toBe(false);
    expect(requiresDepartmentHeadApproval(4, 3, false)).toBe(true);
    expect(requiresDepartmentHeadApproval(1, 3, true)).toBe(true);
  });
});