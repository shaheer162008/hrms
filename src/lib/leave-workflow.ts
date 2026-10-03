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

export function countBusinessLeaveDays(
  startDate: Date,
  endDate: Date,
  holidays: Date[] = [],
) {
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

  const holidayKeys = new Set(
    holidays.map((holiday) => holiday.toISOString().slice(0, 10)),
  );
  let count = 0;

  for (let timestamp = start; timestamp <= end; timestamp += millisecondsPerDay) {
    const date = new Date(timestamp);
    const day = date.getUTCDay();
    const dateKey = date.toISOString().slice(0, 10);

    if (day !== 0 && day !== 6 && !holidayKeys.has(dateKey)) count += 1;
  }

  return count;
}

export function requiresDepartmentHeadApproval(
  days: number,
  thresholdDays: number,
  requiresEscalation: boolean,
) {
  return requiresEscalation || days > thresholdDays;
}