import { Movement } from '../../movements/entities/movement.entity';
import { IPeriod } from './../interfaces/payroll.interfaces';
// src/payroll/context/payroll-context.ts
export class PayrollCalculationContext {
  private _movementBuffer: Movement[] = [];

  constructor(
    public readonly employeeId: string,
    public readonly companyId: string,
    public readonly period: IPeriod,
  ) {}

  get movements(): Readonly<Movement[]> {
    return this._movementBuffer;
  }

  addMovement(movement: Movement): void {
    this._movementBuffer.push(movement);
  }

  addMovements(movements: Movement[]): void {
    this._movementBuffer.push(...movements);
  }

  clearMovements(): void {
    this._movementBuffer.length = 0;
  }
}
