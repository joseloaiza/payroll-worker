import { differenceInDays360 } from 'src/utils/date-utilities';
import { MappingConfig } from '../interfaces/payroll.interfaces';
import { isBefore, isAfter } from 'date-fns';

export function buildMovementData(
  source: Record<string, any>,
  mappings: MappingConfig[],
  codeToConceptId: Map<string, string>,
) {
  return mappings.map(({ daysKey, valueKey, value, code }) => ({
    days: source[daysKey],
    value: valueKey ? source[valueKey] : value,
    conceptId: codeToConceptId.get(code),
  }));
}

export function buildMovementDataRecord(
  days: number,
  value: number,
  code: string,
) {
  return { days, value, code };
}

export function calculateWorkedDays(
  iniContractDate: Date,
  endContractDate: Date | null,
  iniPeriodDate: Date,
  endPeriodDate: Date,
): number {
  // If contract ended before period started, no worked days
  if (endContractDate && isBefore(endContractDate, iniPeriodDate)) {
    return 0;
  }

  // If contract starts after period ends, no worked days
  if (isAfter(iniContractDate, endPeriodDate)) {
    return 0;
  }

  // Calculate effective start: max of (contract start, period start)
  const effectiveStart = isBefore(iniContractDate, iniPeriodDate)
    ? iniPeriodDate
    : iniContractDate;

  // Calculate effective end: min of (contract end or period end, period end)
  const effectiveEnd =
    endContractDate && isBefore(endContractDate, endPeriodDate)
      ? endContractDate
      : endPeriodDate;

  const WorkedDays = differenceInDays360(effectiveStart, effectiveEnd);
  // Ensure result is never negative
  return Math.max(WorkedDays, 0);
}

export function getRealEndDatePeriod(endPeriod: Date): Date {
  const day = endPeriod.getUTCDate();
  const month = endPeriod.getUTCMonth();
  const year = endPeriod.getUTCFullYear();

  if (day === 15) {
    return new Date(endPeriod); // return same date
  }

  // Get the last day of the month
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  // If day is end of month (28, 29, 30, 31) return the real last day
  return new Date(Date.UTC(year, month, lastDayOfMonth, 12, 0, 0));
}
