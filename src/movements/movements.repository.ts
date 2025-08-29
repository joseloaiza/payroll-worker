import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Movement } from './entities/movement.entity';
import { CreateMovementDto } from './dtos/movement.dto';

@Injectable()
export class MovementRepository {
  constructor(
    @InjectRepository(Movement)
    private readonly repo: Repository<Movement>,
  ) {}

  async create(createDto: CreateMovementDto): Promise<Movement> {
    return this.repo.create(createDto);
  }

  async saveMovements(movements: Movement[]): Promise<void> {
    await this.repo.save(movements);
  }

  async removeMovementsByConcepts(
    employee_id: string,
    company_id: string,
    period_id: string,
    concepts: string[],
  ): Promise<void> {
    await this.repo.delete({
      employee_id,
      company_id,
      period_id,
      concept_id: In(concepts),
    });
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
  ) {
    const query = this.repo
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.concept', 'concept')
      .select([
        'movement.concept_id',
        'movement.quantity',
        'movement.value',
        'concept.code as concept_code',
      ])
      .where('movement.employee_id = :employeeId', { employeeId })
      .andWhere('movement.company_id = :companyId', { companyId })
      .andWhere('movement.period_id = :periodId', { periodId })
      .andWhere('concept.isNovelty = true');

    if (conceptGroup && conceptGroup !== 'All') {
      query.andWhere('concept.conceptGroup = :conceptGroup', { conceptGroup });
    }

    return query.getMany();
  }

  /**
   * get the movements sum filter eihther by year or year and month, also
   * is possible send a querystring to filter for any other field
   * @param employeeId
   * @param year
   * @param month
   * @param queryString
   * @returns
   */
  async getSumMovementsValues(
    employeeId: string,
    year: number,
    month?: number,
    queryString: Record<string, any> = {},
    periodId?: string,
  ): Promise<number> {
    const query = this.repo
      .createQueryBuilder('movement')
      .select('SUM(movement.value)', 'totalMovements')
      .innerJoin('movement.concept', 'concept')
      .where('movement.employee_id = :employeeId', { employeeId })
      .andWhere('movement.year = :year', { year });

    if (month !== undefined && month !== null) {
      query.andWhere('movement.month = :month', { month });
    }

    if (periodId !== undefined && periodId !== null) {
      query.andWhere('movement.period_id = :periodId', { periodId });
    }

    // Dynamically add conditions from queryString
    Object.entries(queryString).forEach(([key, value]) => {
      query.andWhere(`concept.${key} = :${key}`, { [key]: value });
    });

    const result = await query.getRawOne();
    // Ensure the returned value is a number
    return Number(result?.totalMovements) || 0;
  }

  /**
   * method to get an employee movement by concept
   * @param employeeId
   * @param year
   * @param month
   * @param code concept code
   * @returns
   */
  async getMovementByConceptMonth(
    employeeId: string,
    year: number,
    month: number,
    code: string,
  ): Promise<Movement | null> {
    return await this.repo
      .createQueryBuilder('movement')
      .innerJoinAndSelect(
        'movement.concept',
        'concept',
        'concept.code = :code',
        { code },
      )
      .where('movement.employee_id = :employeeId', { employeeId })
      .andWhere('movement.year = :year', { year })
      .andWhere('movement.month = :month', { month })
      .select(['movement.id', 'movement.quantity', 'movement.value']) // Selecting specific fields
      .getOne();
  }

  async getSumOfMonthlyMovementsByConcept(
    employeeId: string,
    year: number,
    month: number,
    code: string,
  ): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('movement')
      .select('SUM(movement.value)', 'totalMovements')
      .innerJoin('movement.concept', 'concept')
      .where('movement.employee_id = :employeeId', { employeeId })
      .andWhere('movement.year = :year', { year })
      .andWhere('movement.month = :month', { month })
      .andWhere('concept.code = :code', { code })
      .getRawOne<{ totalMovements: string }>();

    return result?.totalMovements ? parseFloat(result.totalMovements) : 0;
  }

  /**
   * method to get an employee movement by concept
   * @param employeeId
   * @param year
   * @param month
   * @param code concept code
   * @returns
   */
  async getMovementByConceptAndPeriodNumber(
    employeeId: string,
    periodNumber: number,
    code: string,
  ): Promise<Movement | null> {
    return await this.repo
      .createQueryBuilder('movement')
      .innerJoinAndSelect(
        'movement.period',
        'period',
        'period.number = :periodNumber',
        { periodNumber },
      )
      .innerJoinAndSelect(
        'movement.concept',
        'concept',
        'concept.code = :code',
        { code },
      )
      .where('movement.employee_id = :employeeId', { employeeId })
      .select(['movement.id', 'movement.quantity', 'movement.value']) // Selecting specific fields
      .getOne();
  }

  async getMovementsAffectingntiquity(
    month: number,
    year: number,
    employee_id: string,
  ): Promise<{ totalQuantity: number; totalValue: number }> {
    const result = await this.repo
      .createQueryBuilder('movement')
      .innerJoin('movement.concept', 'concept')
      .innerJoin(
        'absenteeType',
        'absenteeType',
        'absenteeType.id = concept.absenteeType_id',
      )
      .where('movement.month = :month', { month })
      .andWhere('movement.year = :year', { year })
      .andWhere('movement.employee_id = :employee_id', { employee_id })
      .andWhere('absenteeType.affectsAntiquity = true')
      .select('SUM(movement.quantity)', 'totalQuantity')
      .addSelect('SUM(movement.value)', 'totalValue')
      .getRawOne();

    return {
      totalQuantity: Number(result.totalQuantity ?? 0),
      totalValue: Number(result.totalValue ?? 0),
    };
  }
}
