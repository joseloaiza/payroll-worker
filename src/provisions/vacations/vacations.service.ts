import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { MovementsService } from './../../movements/movements.service';
import { CodesConfigService } from './../../config/codes-config/codes-config.service';
import { PayrollConstantsService } from './../../config/payroll-constants/payroll-constants.service';
import { getConceptCodes } from './../../utils/concepts.utils';
import { CONCEPT_IDS_VACATION } from './../../constants/constants';
import { MovementData } from './../../utils/interfaces/interfaces';
import { differenceInDays, subYears } from 'date-fns';
import { Movement } from 'src/movements/entities/movement.entity';
import { PayrollContext } from 'src/payroll/interfaces/payroll.interfaces';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class VacationsService {
  constructor(
    private readonly codesConfigService: CodesConfigService,
    private readonly payrollConstantsService: PayrollConstantsService,
    private readonly movementService: MovementsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async calculateVacationProvision(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement[]> {
    const {
      employeeId,
      companyId,
      period,
      contractData,
      salaryData,
      vacationHistory,
    } = context;
    const { initialContractDate } = contractData;
    const { year, month } = period;
    const { salary } = salaryData;

    try {
      const vacationCodes = await getConceptCodes(
        this.codesConfigService,
        CONCEPT_IDS_VACATION,
      );

      //get the days that affect antiquity
      const { totalQuantity: daysaffect } =
        await this.movementService.getMovementsAffectingAntiquity(
          month,
          year,
          employeeId,
        );

      const workedVacationDays =
        differenceInDays(period.endDate, initialContractDate) + 1 + daysaffect;

      let averageInitDate: Date;
      if (workedVacationDays >= 360)
        averageInitDate = subYears(period.endDate, 1);
      else averageInitDate = initialContractDate;

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
          period.endDate,
          {
            ['code']: '/148',
          },
        ),
        this.movementService.getSumMovementsQuantitiesBetweenDates(
          employeeId,
          initialContractDate,
          period.endDate,
          {
            ['code']: 'M035',
          },
        ),
        this.movementService.getSumMovementsQuantitiesBetweenDates(
          employeeId,
          initialContractDate,
          period.endDate,
          {
            ['code']: 'M036',
          },
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
          period.year,
          period.number,
        ),
        this.movementService.getMovementQuantityAndValue(
          vacationCodes.compensatedvacations,
          employeeId,
          period.year,
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
      const movementData: MovementData[] = [
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
      ];

      const movements = await Promise.all(
        movementData.map((m) =>
          this.movementService.create({
            employee_id: employeeId,
            quantity: m.days,
            value: m.value,
            concept_id: conceptsMap.get(m.code),
            period_id: period.id,
            year: period.year,
            month: period.month,
            company_id: companyId,
          }),
        ),
      );

      return movements;
    } catch (error) {
      this.logger.error(
        `Error calculating vacations provision for employee: ${context.employeeId}`,
      );
      throw new Error(
        `Failed to calculate vacations provision : ${error.message}`,
      );
    }
  }
}
