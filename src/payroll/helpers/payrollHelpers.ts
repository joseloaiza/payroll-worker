import { MappingConfig } from '../interfaces/payroll.interfaces';
import { differenceInDays, isBefore, isAfter } from 'date-fns';

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
  numDaysPeriod: number,
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

  // Calculate days (inclusive: both start and end dates count)
  let workedDays = differenceInDays(effectiveEnd, effectiveStart) + 1;

  // Ensure we don't exceed the period's actual days
  workedDays = Math.min(workedDays, numDaysPeriod);

  // Normalize to 30 days for any month with 28, 29, or 31 days
  if (workedDays === 28 || workedDays === 29 || workedDays === 31) {
    workedDays = 30;
  }

  // Ensure result is never negative
  return Math.max(workedDays, 0);
}

// export function calculateWorkedDays(
//   iniDate: Date,
//   endDate: Date,
//   iniPeriod: Date,
//   endPeriod: Date,
//   numDaysPeriod: number,
// ): number {
//   let start = iniDate;
//   let end = endDate;

//   // Ensure start and end dates are within iniPeriod and endPeriod
//   if (isBefore(iniDate, iniPeriod) || isSameDay(iniDate, iniPeriod)) {
//     start = iniPeriod;
//   }
//   if (isAfter(endDate, endPeriod) || isSameDay(endDate, endPeriod)) {
//     end = endPeriod;
//   }

//   // Calculate number of days
//   let workedDays = differenceInDays(end, start) + 1;

//   /// Normalize February (28/29) to 30
//   if (workedDays === 28 || workedDays === 29) {
//     workedDays = 30;
//   }

//   // Normalize full 31-day months to 30
//   if (numDaysPeriod === 31 && workedDays === 31) {
//     workedDays = 30;
//   }

//   return workedDays;
// }

export function getRealEndDatePeriod(endPeriod: Date): Date {
  const newEndDatePeriod =
    endPeriod.getDate() === 15
      ? new Date(endPeriod)
      : new Date(endPeriod.getFullYear(), endPeriod.getMonth(), 30);
  return newEndDatePeriod;
}
