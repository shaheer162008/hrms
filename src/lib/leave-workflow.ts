const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function countInclusiveLeaveDays(startDate: Date, endDate: Date) {
  const start = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
  );
  const end = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
  );

  if (end < start) throw new RangeError("Leave end date must not precede its start date.");
  return Math.floor((end - start) / millisecondsPerDay) + 1;
}

export function requiresDepartmentHeadApproval(
  days: number,
  thresholdDays: number,
  requiresEscalation: boolean,
) {
  return requiresEscalation || days > thresholdDays;
}