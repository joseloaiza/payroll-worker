import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MovementsService } from '../../movements/movements.service';
import { CodesConfigService } from '../../config/codes-config/codes-config.service';
import { PayrollConstantsService } from '../../config/payroll-constants/payroll-constants.service';
import { PayrollContext } from '../interfaces/payroll.interfaces';
import { PayrollCalculationError } from '../exeptions/payroll.exceptions';
import { getConceptCodes } from 'src/utils/concepts.utils';
import { CONCEPT_IDS_EXCESS1393 } from '../../constants/constants';
import { Movement } from '../../movements/entities/movement.entity';

@Injectable()
export class Excess1393CalculatorService {
  constructor(
    private readonly movementService: MovementsService,
    private readonly codesConfigService: CodesConfigService,
    private readonly payrollConstantsService: PayrollConstantsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async calculate(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement[]> {
    this.logger.log(`Calculating 1393 for employee ${context.employeeId}`);
    const { employeeId, period, companyId } = context;

    let excess1393: number = 0;
    try {
      const excess1393Codes = await getConceptCodes(
        this.codesConfigService,
        CONCEPT_IDS_EXCESS1393,
      );
      const [totalNoSalary, totalSalary] = await Promise.all([
        this.movementService.getSumMovementsValues(
          employeeId,
          period.year,
          period.month,
          { ['salaryBase']: false },
        ),
        this.movementService.getSumMovementsValues(
          employeeId,
          period.year,
          period.month,
          { ['salaryBase']: true },
        ),
      ]);

      const totalBaseCree = totalSalary + totalNoSalary;

      const movementData = [
        { days: 0, value: totalSalary, code: excess1393Codes.salariesPay },
        { days: 0, value: totalNoSalary, code: excess1393Codes.salariesNoPay },
        {
          days: 0,
          value: totalBaseCree,
          code: excess1393Codes.totalIncomminBaseCreed,
        },
      ];

      if (totalNoSalary > 0) {
        const T139: number =
          await this.payrollConstantsService.getConstantValue(
            excess1393Codes.topLaw1393,
          );
        const baseExempt = totalBaseCree * (T139 / 100);
        movementData.push({
          days: 0,
          value: baseExempt,
          code: excess1393Codes.excentBase,
        });

        if (totalNoSalary < baseExempt) excess1393 = 0;
        else excess1393 = totalNoSalary - baseExempt;

        const movement_excess_law_1393 =
          await this.movementService.getMovementByConceptMonth(
            employeeId,
            period.year,
            period.month,
            excess1393Codes.excess1393Law,
          );

        if (movement_excess_law_1393) {
          excess1393 =
            Math.max(0, excess1393 - movement_excess_law_1393.value) ||
            movement_excess_law_1393.value - 1;
        }
        movementData.push({
          days: 0,
          value: Math.max(excess1393, 0),
          code: excess1393Codes.excess1393Law,
        });
      }

      const { successes } = await this.movementService.createMovements(
        movementData,
        employeeId,
        companyId,
        period,
        conceptsMap,
      );

      context.excess1393 = excess1393;
      context.totalBaseCree = totalBaseCree;

      return successes;
    } catch (error) {
      this.logger.error(
        `Error calculating excess 1393 for employee: ${employeeId}`,
      );
      throw new PayrollCalculationError(
        `No se pudo calcular el exceso a la ley 1393: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
