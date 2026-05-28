import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AbsenteeismService } from '../../novelties/absenteeism/absenteeism.service';
import { RecurrentPaymentService } from '../../novelties/recurrent-payment/recurrent-payment.service';
import { MovementsService } from '../../movements/movements.service';
import { CodesConfigService } from '../../config/codes-config/codes-config.service';
import {
  diseaseMappings,
  licenseMappings,
  PayrollContext,
} from '../interfaces/payroll.interfaces';
import { PayrollCalculationContext } from '../context/payroll-context';
import {
  PayrollCalculationError,
  PayrollValidationError,
} from '../exeptions/payroll.exceptions';
import {
  buildMovementData,
  calculateWorkedDays,
} from '../helpers/payrollHelpers';
import { getConceptCodes } from 'src/utils/concepts.utils';
import { CONCEPT_IDS_SALARY } from '../../constants/constants';
import { Movement } from '../../movements/entities/movement.entity';

@Injectable()
export class CorePayrollCalculatorService {
  constructor(
    private readonly absenteeismService: AbsenteeismService,
    private readonly recurrentPaymentService: RecurrentPaymentService,
    private readonly movementService: MovementsService,
    private readonly codesConfigService: CodesConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async calculate(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
    calculateMovements: PayrollCalculationContext,
    liquidationId?: string,
  ): Promise<{ rawSalary: number }> {
    this.logger.log(`Calculating absentees for employee ${context.employeeId}`);
    const { movements: absenteeMovements, totalAbseenteDays } =
      await this.calculateAbsentees(context, conceptsMap);
    calculateMovements.addMovements(absenteeMovements);
    context.totalAbseenteDays = totalAbseenteDays;

    this.logger.log(
      `Calculating Recurrents for employee ${context.employeeId}`,
    );
    calculateMovements.addMovements(await this.calculateRecurrents(context));

    this.logger.log(`Calculating Salary for employee ${context.employeeId}`);
    const { movements: salaryMovements, rawSalary } =
      await this.calculateSalary(context, conceptsMap);
    calculateMovements.addMovements(salaryMovements);

    const mutableMovements = [...calculateMovements.movements];
    if (liquidationId)
      mutableMovements.forEach((m) => (m.liquidation_id = liquidationId));
    await this.movementService.saveMovements(mutableMovements);
    calculateMovements.clearMovements();

    return { rawSalary };
  }

  private async calculateAbsentees(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<{ movements: Movement[]; totalAbseenteDays: number }> {
    const { companyId, employeeId, period } = context;

    let disease, license, totalAbsenteeDays;
    try {
      [disease, license, totalAbsenteeDays] = await Promise.all([
        await this.absenteeismService.processSickLeaveAbsences(
          employeeId,
          period.initialDate,
          period.endDate,
        ),
        await this.absenteeismService.processLicenseAbsences(
          employeeId,
          period.initialDate,
          period.endDate,
        ),
        await this.absenteeismService.calculateTotalDaysAbsences(
          employeeId,
          period.initialDate,
          period.endDate,
        ),
      ]);
    } catch (error) {
      this.logger.error(
        `Failed calculating absentees for ${context.employeeId} on company ${context.companyId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new PayrollCalculationError(
        `No se pudo calcular las novedades por ausentismos: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const allCodes = [
      ...diseaseMappings.map((m) => m.code),
      ...licenseMappings.map((m) => m.code),
    ];

    const idToCode = await this.codesConfigService.getManyCodesByIds(allCodes);
    const codeToConceptId = new Map(
      allCodes.map((id) => [id, conceptsMap.get(idToCode[id])]),
    );

    const diseaseMovements = buildMovementData(
      disease,
      diseaseMappings,
      codeToConceptId,
    );
    const licenseMovements = buildMovementData(
      license,
      licenseMappings,
      codeToConceptId,
    );
    const movementData = [...diseaseMovements, ...licenseMovements];

    if (totalAbsenteeDays > 0)
      movementData.push({
        days: totalAbsenteeDays,
        value: 0,
        conceptId: conceptsMap.get(
          await this.codesConfigService.getCodeById('0007'),
        ),
      });

    const movements = await Promise.all(
      movementData.map(({ days, value, conceptId }) =>
        this.movementService.create({
          employee_id: employeeId,
          quantity: days,
          value,
          concept_id: conceptId,
          period_id: period.id,
          year: period.year,
          month: period.month,
          company_id: companyId,
        }),
      ),
    );

    return { movements, totalAbseenteDays: totalAbsenteeDays };
  }

  private async calculateRecurrents(
    context: PayrollContext,
  ): Promise<Movement[]> {
    const { employeeId, companyId, period } = context;
    try {
      return await this.recurrentPaymentService.processRecurrent(
        employeeId,
        companyId,
        period.id,
        period.year,
        period.month,
      );
    } catch (error) {
      this.logger.error(
        `Error calculating recurrents for employee: ${employeeId}`,
      );
      throw new PayrollCalculationError(
        `No se pudo calcular los recurrentes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async calculateSalary(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<{ movements: Movement[]; rawSalary: number }> {
    const {
      employeeId,
      companyId,
      period,
      contractData,
      salaryData,
      totalAbseenteDays,
    } = context;
    const { salary, salaryTypeCode } = salaryData;
    const { contractsInPeriod } = contractData;

    if (!employeeId || !companyId || !period || !salaryData || !contractData) {
      this.logger.error('Missing required payroll context fields');
      throw new PayrollValidationError('Invalid payroll context');
    }
    try {
      const salaryCodes = await getConceptCodes(
        this.codesConfigService,
        CONCEPT_IDS_SALARY,
      );

      const totalWorkedDays = contractsInPeriod.reduce((total, contract) => {
        const workedDays = calculateWorkedDays(
          contract.initialContractDate,
          contract.endContractDate,
          period.initialDate,
          period.endDate,
        );
        return total + workedDays;
      }, 0);

      const daysSalary = totalWorkedDays - totalAbseenteDays;
      const valueSalary = Math.round(((salary / 30) * daysSalary * 100) / 100);

      const movementCodes = new Map([
        [salaryCodes.ordinarySalaryCon, salaryCodes.ordinarySalary],
        [salaryCodes.integralSalaryCon, salaryCodes.integralSalary],
        [salaryCodes.sustenanceHelpCon, salaryCodes.sustenanceHelp],
        [salaryCodes.pensionAllowanceCon, salaryCodes.pensionAllowance],
      ]);
      const movementCode = movementCodes.get(salaryTypeCode) || undefined;
      if (!movementCode) {
        this.logger.warn(
          `Unknown salary type code: ${salaryTypeCode} for employee ${employeeId}`,
        );
      }
      const movementData = [
        { days: totalWorkedDays, value: 0, code: salaryCodes.workedDaysPeriod },
      ];

      if (movementCode) {
        const configCode =
          await this.codesConfigService.getConfigByCode(movementCode);
        movementData.push({
          days: daysSalary,
          value: valueSalary,
          code: configCode.code,
        });
      }

      const { successes } = await this.movementService.createMovements(
        movementData,
        employeeId,
        companyId,
        period,
        conceptsMap,
      );

      return { movements: successes, rawSalary: valueSalary };
    } catch (error) {
      this.logger.error(
        `Error calculating salary for employee: ${employeeId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new PayrollCalculationError(
        `No se pudo calcular el salario: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
