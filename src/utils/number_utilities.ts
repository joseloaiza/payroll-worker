import { ValueTransformer } from 'typeorm';

export function isBetween(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export const numberTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | number): number => Number(value),
};
