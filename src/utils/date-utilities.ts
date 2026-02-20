import { differenceInDays, isBefore, isEqual } from 'date-fns';
import { ValueTransformer } from 'typeorm';

export function numberDays(startDate: Date, endDate: Date) {
  return differenceInDays(endDate, startDate) + 1;
}

export function isSameOrBefore(date1: Date, date2: Date): boolean {
  return isBefore(date1, date2) || isEqual(date1, date2);
}

export const dateTransformer: ValueTransformer = {
  to: (value: Date) => value, // lo guarda como está
  from: (value: string | Date) => new Date(value), // lo transforma al leer
};

export const nullableDateTransformer: ValueTransformer = {
  to: (value: Date | null) => (value ? value : null), // when saving
  from: (value: string | Date | null) => (value ? new Date(value) : null), // when reading
};

export function convertDateToUTC(stringDate: string): Date {
  const [year, month, day] = stringDate.split('T')[0].split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // UTC noon
  // const [year, month, day] = stringDate.split('T')[0].split('-').map(Number);
  // return new Date(year, month - 1, day); // local midnight, date won't shift
}

export function differenceInDays360(startDate: Date, endDate: Date): number {
  const y1 = startDate.getUTCFullYear();
  const m1 = startDate.getUTCMonth() + 1;
  const d1 = normalizeDay(startDate);

  const y2 = endDate.getUTCFullYear();
  const m2 = endDate.getUTCMonth() + 1;
  const d2 = normalizeDay(endDate);

  return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1) + 1; // +1 inclusive
}

function normalizeDay(date: Date): number {
  const day = date.getUTCDate();
  const lastDayOfMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();

  return day === lastDayOfMonth ? 30 : day;
}
