import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { MovementsService } from './../../movements/movements.service';
import { CodesConfigService } from './../../config/codes-config/codes-config.service';
import { PayrollConstantsService } from './../../config/payroll-constants/payroll-constants.service';
import { getConceptCodes } from './../../utils/concepts.utils';
import { CONCEPT_IDS_VACATION } from './../../constants/constants';
import { differenceInDays, subYears } from 'date-fns';
import { Movement } from 'src/movements/entities/movement.entity';
import { PayrollContext } from 'src/payroll/interfaces/payroll.interfaces';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AbsenteeHistoryRepository } from './../../novelties/absenteeism/absentee-history.repository';
import { numberDays } from './../../utils/date-utilities';
import { VacationCalculationData } from 'src/liquidation/interfaces/liquidation.interfaces';

@Injectable()
export class VacationsService {
  constructor(
    private readonly codesConfigService: CodesConfigService,
    private readonly payrollConstantsService: PayrollConstantsService,
    private readonly movementService: MovementsService,
    private readonly absenteeHistoryRepo: AbsenteeHistoryRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async calculateVacationProvision(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement[]> {
    const { employeeId, companyId, period } = context;
    try {
      const data = await this.calculateVacationData(
        context,
        context.period.endDate,
      );
      return Promise.all(
        data.items.map((item) =>
          this.movementService.create({
            employee_id: employeeId,
            quantity: item.days,
            value: item.value,
            concept_id: conceptsMap.get(item.code),
            period_id: period.id,
            year: period.year,
            month: period.month,
            company_id: companyId,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Error calculating vacations provision for employee: ${context.employeeId}`,
      );
      throw new Error(
        `No se pudo calcular la provisión de las vacaciones : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async calculateVacationData(
    context: PayrollContext,
    cutoffDate: Date,
  ): Promise<VacationCalculationData> {
    const { employeeId, period, contractData, salaryData, vacationHistory } =
      context;
    const { initialContract } = contractData;
    const { salary } = salaryData;

    const cutoffYear = cutoffDate.getUTCFullYear();
    const cutoffMonth = cutoffDate.getUTCMonth() + 1;

    const vacationCodes = await getConceptCodes(
      this.codesConfigService,
      CONCEPT_IDS_VACATION,
    );

    const { totalQuantity: daysaffect } =
      await this.movementService.getMovementsAffectingAntiquity(
        cutoffMonth,
        cutoffYear,
        employeeId,
      );

    const workedVacationDays =
      differenceInDays(cutoffDate, initialContract.initialContractDate) +
      1 +
      daysaffect;

    let averageInitDate: Date;
    if (workedVacationDays >= 360) averageInitDate = subYears(cutoffDate, 1);
    else averageInitDate = initialContract.initialContractDate;

    const [
      variablePartProvision,
      sumVacationsTaken,
      sumCompensetedVacation,
      newVacationBalancePreviousPeriod,
      VacationsTaken,
      CompensetedVacation,
    ] = await Promise.all([
      this.movementService.getSumMovementsValuesBetweenDates(
        employeeId,
        averageInitDate,
        cutoffDate,
        { ['code']: '/148' },
      ),
      this.movementService.getSumMovementsQuantitiesBetweenDates(
        employeeId,
        initialContract.initialContractDate,
        cutoffDate,
        { ['code']: 'M035' },
      ),
      this.movementService.getSumMovementsQuantitiesBetweenDates(
        employeeId,
        initialContract.initialContractDate,
        cutoffDate,
        { ['code']: 'M036' },
      ),
      this.movementService.getMovementQuantityAndValue(
        vacationCodes.newBalanceProvisionVacation,
        employeeId,
        period.previousPeriodYear,
        period.previousPeriodNumber,
      ),
      this.movementService.getMovementQuantityAndValue(
        vacationCodes.vacationEnjoyed,
        employeeId,
        cutoffYear,
        period.number,
      ),
      this.movementService.getMovementQuantityAndValue(
        vacationCodes.compensatedvacations,
        employeeId,
        cutoffYear,
        period.number,
      ),
    ]);

    const baseProvisionVariablePart = (variablePartProvision / 360) * 30;
    const vacationsPayDays =
      sumVacationsTaken + sumCompensetedVacation + vacationHistory;
    const newVacationBalanceDays =
      (workedVacationDays * 15) / 360 - vacationsPayDays;
    const newVacationBalanceValue =
      newVacationBalanceDays * ((baseProvisionVariablePart + salary) / 30);

    const vacationsDaysPayed =
      VacationsTaken.quantity + CompensetedVacation.quantity;
    const provisionVacationsDays =
      newVacationBalanceDays -
      vacationsDaysPayed -
      newVacationBalancePreviousPeriod.quantity;
    const provisionVacationsValue =
      provisionVacationsDays * ((baseProvisionVariablePart + salary) / 30);

    return {
      items: [
        {
          days: workedVacationDays,
          value: 0,
          code: vacationCodes.vacationWorkedDays,
        },
        {
          days: 0,
          value: baseProvisionVariablePart,
          code: vacationCodes.variableProvisionVacationBase,
        },
        {
          days: 0,
          value: salary,
          code: vacationCodes.staticProvisionVacationBase,
        },
        {
          days: 0,
          value: baseProvisionVariablePart + salary,
          code: vacationCodes.provisionVacationBase,
        },
        {
          days: newVacationBalanceDays,
          value: newVacationBalanceValue,
          code: vacationCodes.newBalanceProvisionVacation,
        },
        {
          days: newVacationBalancePreviousPeriod.quantity,
          value: newVacationBalancePreviousPeriod.value,
          code: vacationCodes.previousBalanceVacation,
        },
        {
          days: provisionVacationsDays,
          value: provisionVacationsValue,
          code: vacationCodes.vacationsProvicion,
        },
      ],
    };
  }

  async calculateVacationsEnjoyed(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement[]> {
    const { employeeId, companyId, period, salaryData } = context;
    const { salary } = salaryData;

    try {
      const vacationCodes = await getConceptCodes(
        this.codesConfigService,
        CONCEPT_IDS_VACATION,
      );

      const absences =
        await this.absenteeHistoryRepo.getVacationAbsencesByPeriod(
          employeeId,
          period.initialDate,
          period.endDate,
        );

      let totalDays = 0;
      for (const absence of absences) {
        const fechaInicioLiquidacion =
          absence.initialAbsencesDate > period.initialDate
            ? absence.initialAbsencesDate
            : period.initialDate;
        const fechaFinLiquidacion =
          absence.endAbsencesDate < period.endDate
            ? absence.endAbsencesDate
            : period.endDate;

        if (fechaInicioLiquidacion <= fechaFinLiquidacion) {
          totalDays += numberDays(fechaInicioLiquidacion, fechaFinLiquidacion);
        }
      }

      const value = Math.round((salary / 30) * totalDays);

      const movement = await this.movementService.create({
        employee_id: employeeId,
        quantity: totalDays,
        value,
        concept_id: conceptsMap.get(vacationCodes.vacationEnjoyed),
        period_id: period.id,
        year: period.year,
        month: period.month,
        company_id: companyId,
      });

      return [movement];
    } catch (error) {
      this.logger.error(
        `Error calculating vacation days enjoyed for employee: ${context.employeeId}`,
      );
      throw new Error(
        `No se pudo calcular los días de vacaciones disfrutadas: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
