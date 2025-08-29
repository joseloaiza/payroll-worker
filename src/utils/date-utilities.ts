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
