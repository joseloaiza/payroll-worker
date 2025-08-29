import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { MovementRepository } from './movements.repository';
import { CreateMovementDto } from './dtos/movement.dto';
import { Movement } from './entities/movement.entity';
import { Period } from 'src/payroll/entities/period.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class MovementsService {
  constructor(
    private readonly repo: MovementRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateMovementDto): Promise<Movement> {
    const movement = this.repo.create({
      ...dto,
    });
    return movement;
  }

  async createMovements(
    movementData: any[],
    employeeId: string,
    companyId: string,
    period: Period,
    conceptsMap: Map<string, string>,
  ): Promise<{ successes: Movement[]; failures: string[] }> {
    const failures: string[] = [];

    // 1️⃣ Separate valid and invalid movements
    const validMovements = movementData.filter((m) => {
      const conceptId = conceptsMap.get(m.code);
      if (!conceptId) {
        this.logger.error(`Concept ID not found for code: ${m.code}`);
        failures.push(m.code);
        return false; // skip this one
      }
      return true;
    });

    // 2️⃣ Save all valid movements
    const successes = await Promise.all(
      validMovements.map((m) =>
        this.create({
          employee_id: employeeId,
          quantity: m.days,
          value: m.value,
          concept_id: conceptsMap.get(m.code)!, // safe because we filtered
          period_id: period.id,
          year: period.year,
          month: period.month,
          company_id: companyId,
        }),
      ),
    );

    // 3️⃣ Return both results
    return { successes, failures };
  }

  async saveMovements(
    ...movementArrays: (Movement[] | null | undefined)[]
  ): Promise<void> {
    // Filter out null/undefined arrays and flatten the remaining movements
    const allMovements: Movement[] = movementArrays
      .filter((arr): arr is Movement[] => Array.isArray(arr) && arr.length > 0)
      .flat();

    if (allMovements.length === 0) {
      return;
    }

    const movements_to_save = allMovements.filter(
      (mov) => !(mov.quantity === 0 && mov.value === 0),
    );

    await this.repo.saveMovements(movements_to_save);
  }

  async removeMovementsByConcepts(
    employee_id: string, // Supports multiple employees
    company_id: string,
    period_id: string,
    concept_ids: string[],
  ): Promise<void> {
    return await this.repo.removeMovementsByConcepts(
      employee_id,
      company_id,
      period_id,
      concept_ids,
    );
  }

  /**
   * Method to get all employee novelties movements
   * @param employeeId
   * @param companyId
   * @param periodId
   * @param conceptGroup
   * @returns
   */
  async getMovementsNoveltiesTypeInPeriod(
    employeeId: string,
    companyId: string,
    periodId: string,
    conceptGroup?: string,
  ): Promise<Movement[]> {
    return await this.repo.getMovementsNoveltiesTypeInPeriod(
      employeeId,
      companyId,
      periodId,
      conceptGroup,
    );
  }

  async getSumMovementsValues(
    employeeId: string,
    year: number,
    month: number,
    queryString: object,
    periodId?: string,
  ): Promise<number> {
    return this.repo.getSumMovementsValues(
      employeeId,
      year,
      month,
      queryString,
      periodId,
    );
  }

  async getSumOfMonthlyMovementsByConcept(
    employeeId: string,
    year: number,
    month: number,
    code: string,
  ): Promise<number> {
    return await this.repo.getSumOfMonthlyMovementsByConcept(
      employeeId,
      year,
      month,
      code,
    );
  }

  /**
   * method to get an employee movement by concept
   * @param employeeId
   * @param year
   * @param month
   * @param code
   * @returns
   */

  async getMovementByConceptMonth(
    employeeId: string,
    year: number,
    month: number,
    code: string,
  ): Promise<Movement> {
    const movement = await this.repo.getMovementByConceptMonth(
      employeeId,
      year,
      month,
      code,
    );
    return movement;
  }

  async getMovementByConceptAndPeriodNumber(
    employeeId: string,
    periodNumber: number,
    code: string,
  ): Promise<Movement> {
    const movement = await this.repo.getMovementByConceptAndPeriodNumber(
      employeeId,
      periodNumber,
      code,
    );

    return movement;
  }

  async getMovementsAffectingAntiquity(
    month: number,
    year: number,
    employee_id: string,
  ): Promise<{ totalQuantity: number; totalValue: number }> {
    return this.repo.getMovementsAffectingntiquity(month, year, employee_id);
  }

  async getQuantityAndValue(
    concep: string,
    employee_id: string,
    period_number: number,
  ): Promise<{ quantity: number; value: number }> {
    const movement = await this.getMovementByConceptAndPeriodNumber(
      employee_id,
      period_number - 1,
      concep,
    );

    if (movement) {
      return { quantity: movement.quantity, value: movement.value };
    }
    return { quantity: 0, value: 0 };
  }
}
