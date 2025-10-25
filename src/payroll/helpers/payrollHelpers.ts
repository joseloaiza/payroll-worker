import { MappingConfig } from '../interfaces/payroll.interfaces';
import { differenceInDays, isBefore, isAfter, isSameDay } from 'date-fns';

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
  iniDate: Date,
  endDate: Date,
  iniPeriod: Date,
  endPeriod: Date,
  numDaysPeriod: number,
): number {
  let start = iniDate;
  let end = endDate;

  // Ensure start and end dates are within iniPeriod and endPeriod
  if (isBefore(iniDate, iniPeriod) || isSameDay(iniDate, iniPeriod)) {
    start = iniPeriod;
  }
  if (isAfter(endDate, endPeriod) || isSameDay(endDate, endPeriod)) {
    end = endPeriod;
  }

  // Calculate number of days
  let workedDays = differenceInDays(end, start) + 1;

  /// Normalize February (28/29) to 30
  if (workedDays === 28 || workedDays === 29) {
    workedDays = 30;
  }

  // Normalize full 31-day months to 30
  if (numDaysPeriod === 31 && workedDays === 31) {
    workedDays = 30;
  }

  return workedDays;
}

export function getRealEndDatePeriod(endPeriod: Date): Date {
  const newEndDatePeriod =
    endPeriod.getDate() === 15
      ? new Date(endPeriod)
      : new Date(endPeriod.getFullYear(), endPeriod.getMonth(), 30);
  return newEndDatePeriod;
}
