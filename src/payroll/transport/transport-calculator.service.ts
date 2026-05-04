import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MovementsService } from '../../movements/movements.service';
import { CodesConfigService } from '../../config/codes-config/codes-config.service';
import { PayrollConstantsService } from '../../config/payroll-constants/payroll-constants.service';
import { PayrollContext } from '../interfaces/payroll.interfaces';
import { PayrollCalculationContext } from '../context/payroll-context';
import { getConceptCodes } from 'src/utils/concepts.utils';
import {
  CONCEPT_IDS_TRANSPORT,
  CONSTANTS_IDS_TRANSPORT,
} from '../../constants/constants';
import { Movement } from '../../movements/entities/movement.entity';

@Injectable()
export class TransportCalculatorService {
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
    calculateMovements: PayrollCalculationContext,
  ): Promise<void> {
    this.logger.log(
      `Calculating transort asistance for employee ${context.employeeId}`,
    );
    const transportCalculations = await Promise.all([
      this.calculateBase(context, conceptsMap),
      this.calculateAssistance(context, conceptsMap),
    ]);
    calculateMovements.addMovements(
      transportCalculations.filter((m): m is Movement => m !== null),
    );

    const mutableMovements = [...calculateMovements.movements];
    await this.movementService.saveMovements(mutableMovements);
    calculateMovements.clearMovements();
  }

  private async calculateBase(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement | null> {
    const { employeeId, period, companyId } = context;
    try {
      if (
        !context.contractData.transportAssistance ||
        !context.contractData.variableSalary
      ) {
        return null;
      }

      const transportBase = await this.movementService.getSumMovementsValues(
        employeeId,
        period.year,
        undefined,
        { ['transportBase']: true },
        period.id,
      );
      const concepId = conceptsMap.get(
        await this.codesConfigService.getCodeById('0081'),
      );
      return await this.movementService.create({
        employee_id: employeeId,
        quantity: 0,
        value: transportBase,
        concept_id: concepId,
        period_id: period.id,
        year: period.year,
        month: period.month,
        company_id: companyId,
      });
    } catch (error) {
      this.logger.error(
        `Error calculating transport base for employee: ${context.employeeId}`,
      );
      throw new Error(
        `No se pudo calcular la base para el transporte: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async calculateAssistance(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement | null> {
    const { employeeId, period, salaryData, companyId } = context;
    const { salary: actualSalary } = salaryData;
    if (!context.contractData.transportAssistance) {
      return null;
    }

    try {
      const transportCodes = await getConceptCodes(
        this.codesConfigService,
        CONCEPT_IDS_TRANSPORT,
      );

      const values = await this.payrollConstantsService.getConstantsByIds(
        CONSTANTS_IDS_TRANSPORT,
        this.codesConfigService,
      );
      const { ttle, autl, smlv } = values;
      const MovementWorkedDays =
        await this.movementService.getMovementByConceptAndPeriodNumber(
          employeeId,
          period.year,
          period.number,
          transportCodes.workedDaysPeriod,
        );

      let transportValue = 0;
      const isEligibleForTransport = actualSalary <= ttle * smlv;
      const dailyAllowance = autl / 30;
      if (context.contractData.variableSalary) {
        const previousMonthTotal =
          await this.movementService.getSumOfMonthlyMovementsByConcept(
            employeeId,
            period.year,
            period.month - 1,
            transportCodes.transportBase,
          );

        if (
          previousMonthTotal > 0
            ? previousMonthTotal <= ttle * smlv
            : isEligibleForTransport
        ) {
          transportValue = dailyAllowance * MovementWorkedDays.quantity;
        }
      } else if (isEligibleForTransport) {
        transportValue = dailyAllowance * MovementWorkedDays.quantity;
      }

      const concepId = conceptsMap.get(transportCodes.legalTransportAssitance);

      return await this.movementService.create({
        employee_id: employeeId,
        quantity: MovementWorkedDays.quantity,
        value: transportValue,
        concept_id: concepId,
        period_id: period.id,
        year: period.year,
        month: period.month,
        company_id: companyId,
      });
    } catch (error) {
      this.logger.error(
        `Error calculating transport assistance  for employee: ${context.employeeId}`,
      );
      throw new Error(
        `No se pudo calcular el auxilio de transporte: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
