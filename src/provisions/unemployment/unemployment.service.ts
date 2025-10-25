import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { MovementsService } from './../../movements/movements.service';
import { CodesConfigService } from './../../config/codes-config/codes-config.service';
import { PayrollConstantsService } from './../../config/payroll-constants/payroll-constants.service';
import { getConceptCodes } from './../../utils/concepts.utils';
import {
  CONCEPT_IDS_UNEMPLOYMENT,
  CONCEPT_IDS_UNEMPLOYMENT_INTEREST,
} from './../../constants/constants';
import { MovementData } from './../../utils/interfaces/interfaces';
import { differenceInDays } from 'date-fns';
import { Movement } from 'src/movements/entities/movement.entity';
import { PayrollContext } from 'src/payroll/interfaces/payroll.interfaces';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class UnemploymentService {
  constructor(
    private readonly codesConfigService: CodesConfigService,
    private readonly payrollConstantsService: PayrollConstantsService,
    private readonly movementService: MovementsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async calculateUnemploymentProvision(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement[]> {
    const { employeeId, companyId, period, contractData, salaryData } = context;
    const { initialContractDate, regimeCode } = contractData;
    const { salary } = salaryData;

    const unemploymentCodes = await getConceptCodes(
      this.codesConfigService,
      CONCEPT_IDS_UNEMPLOYMENT,
    );

    try {
      const [
        workedDays,
        baseVariableConcepts,
        alreadyPaidDays,
        previousBalance,
        payedDays,
      ] = await Promise.all([
        // worked days save in concept /133
        this.calculateWorkedDays(
          employeeId,
          period.month,
          period.year,
          period.endDate,
          initialContractDate,
          regimeCode,
          false,
        ),
        this.calculateBaseConcepts(employeeId, period.year, period.month),
        // calculate this is the concept M033 in movements actual year
        this.movementService.getSumMovementsValues(
          employeeId,
          period.year,
          undefined,
          {
            ['code']: 'M033',
          },
        ),
        this.getUnemploymentPreviousPeriod(
          employeeId,
          period.previousPeriodYear,
          period.previousPeriodNumber,
          unemploymentCodes.newValue,
        ),
        this.movementService.getMovementQuantityAndValue(
          unemploymentCodes.previousValue,
          employeeId,
          period.year,
          period.number,
        ),
      ]);
      const baseProvision = baseVariableConcepts + salary;
      const totalUnemploymentDays = this.calculateUnpaidDays(
        workedDays,
        alreadyPaidDays,
      );
      const unpaidDays = totalUnemploymentDays - alreadyPaidDays;
      const unpaidValue = unpaidDays * (baseProvision / 30); //save in cocep /136 value

      const { totalQuantity: previousDays, totalValue: previousValue } =
        previousBalance;
      const { quantity: unemployedPayedDays, value: unemployedPayedValue } =
        payedDays;
      const { days: provisionDays, value: provisionValue } =
        this.calculateProvision(
          unpaidDays,
          previousDays,
          unemployedPayedDays,
          unpaidValue, //newValue
          previousValue, // previusValue
          unemployedPayedValue, // value payed
          //baseVariableConcepts,
        );

      const movementData: MovementData[] = [
        { days: workedDays, value: 0, code: unemploymentCodes.workedDays },
        {
          days: 0,
          value: baseVariableConcepts,
          code: unemploymentCodes.variablePart,
        },
        { days: 0, value: salary, code: unemploymentCodes.staticPart },
        { days: 0, value: baseProvision, code: unemploymentCodes.base },
        {
          days: unpaidDays,
          value: unpaidValue,
          code: unemploymentCodes.newValue,
        },
        {
          days: previousDays,
          value: previousValue,
          code: unemploymentCodes.previousValue,
        },
        {
          days: provisionDays,
          value: provisionValue,
          code: unemploymentCodes.provision,
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
        `Error calculating unemployment provision for employee: ${context.employeeId}`,
      );
      throw new Error(
        `Failed to calculate unemployment provision : ${error.message}`,
      );
    }
  }

  async calculateInterestUnemploymentProvision(
    context: PayrollContext,
    conceptMap: Map<string, string>,
    calculaeUnpaidValue: number,
  ): Promise<Movement[]> {
    const { employeeId, companyId, period, contractData } = context;
    const { initialContractDate, regimeCode } = contractData;

    const interestUnemploymentCodes = await getConceptCodes(
      this.codesConfigService,
      CONCEPT_IDS_UNEMPLOYMENT_INTEREST,
    );

    try {
      const [
        workedDaysInterest,
        interestPaidDays,
        previusMonthInterest,
        InterestPayedDays,
      ] = await Promise.all([
        this.calculateWorkedDays(
          employeeId,
          period.month,
          period.year,
          period.endDate,
          initialContractDate,
          regimeCode,
          true,
        ),
        this.movementService.getSumMovementsValues(
          employeeId,
          period.year,
          undefined,
          {
            ['code']: 'M034',
          },
        ),
        this.getUnemploymentPreviousPeriod(
          employeeId,
          period.previousPeriodYear,
          period.previousPeriodNumber,
          interestUnemploymentCodes.interestNew,
        ),
        this.movementService.getMovementQuantityAndValue(
          interestUnemploymentCodes.unemployedInterestPayed,
          employeeId,
          period.year,
          period.number,
        ),
      ]);

      const interestBaseValue = calculaeUnpaidValue;
      //calculate new balance unemployed interest
      const interestFactorDays =
        await this.payrollConstantsService.getConstantValue(
          interestUnemploymentCodes.interestFactor,
        );

      const totalInterestDays = (workedDaysInterest * interestFactorDays) / 360;
      const interestDays = totalInterestDays - interestPaidDays; // save in concept /136 quantity
      const interestValue = interestDays * (interestBaseValue / 30); //save in cocep /136 value

      //calcultate before month for interest
      const {
        totalQuantity: previousInterestDays,
        totalValue: previousInterestValue,
      } = previusMonthInterest;

      const {
        quantity: unemployedInterestPayedDays,
        value: unemployedInterestPayedValue,
      } = InterestPayedDays;

      const provisionInterestDays =
        interestDays + unemployedInterestPayedDays - previousInterestDays;
      const provisionInterestValue =
        interestValue + unemployedInterestPayedValue - previousInterestValue;
      //provisionInterestDays * (interestBaseValue / 30);

      const movementData: MovementData[] = [
        {
          days: interestDays,
          value: 0,
          code: interestUnemploymentCodes.interestDays,
        },
        {
          days: 0,
          value: interestBaseValue,
          code: interestUnemploymentCodes.interestBase,
        },
        {
          days: interestDays,
          value: interestValue,
          code: interestUnemploymentCodes.interestNew,
        },
        {
          days: previousInterestDays,
          value: previousInterestValue,
          code: interestUnemploymentCodes.interestBefore,
        },
        {
          days: provisionInterestDays,
          value: provisionInterestValue,
          code: interestUnemploymentCodes.interestProvision,
        },
      ];

      const movements = await Promise.all(
        movementData.map((m) =>
          this.movementService.create({
            employee_id: employeeId,
            quantity: m.days,
            value: m.value,
            concept_id: conceptMap.get(m.code),
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
        `Error calculating unemployment provision for employee: ${context.employeeId}`,
      );
      throw new Error(
        `Failed to calculate unemployment provision : ${error.message}`,
      );
    }
  }

  private calculateUnpaidDays(
    workedDays: number,
    alreadyPaidDays: number,
  ): number {
    return (workedDays * 30) / 360 - alreadyPaidDays;
  }

  private calculateProvision(
    unpaidDays: number,
    previousDays: number,
    unemploymentPayedDays: number,
    unpaidValue: number,
    previousValue: number,
    unemployedPayedValue: number,
    //baseVariableConcepts: number,
  ): { days: number; value: number } {
    const provisionDays = unpaidDays - previousDays - unemploymentPayedDays;
    const provisionValue = unpaidValue + unemployedPayedValue - previousValue;
    //const provisionValue = provisionDays * (baseVariableConcepts / 30);
    return { days: provisionDays, value: provisionValue };
  }

  private async calculateWorkedDays(
    employee_id: string,
    month: number,
    year: number,
    endPeriod: Date,
    admissionDate: Date,
    regimeCode: string,
    interest: boolean,
  ): Promise<number> {
    // Validate input dates
    if (!(endPeriod instanceof Date) || !(admissionDate instanceof Date)) {
      throw new Error('Invalid date parameters');
    }

    const new_date_end_period =
      endPeriod.getDate() === 15
        ? new Date(endPeriod)
        : new Date(endPeriod.getFullYear(), endPeriod.getMonth(), 30);

    let initialProvisionDate: Date;
    // Determine initial provision date based on regime
    if (!interest) {
      const isSpecialRegime =
        (await this.codesConfigService.getCodeById('0060')) === regimeCode;
      initialProvisionDate = isSpecialRegime
        ? new Date(`${endPeriod.getFullYear()}-01-01`) // Start of year for special regime
        : new Date(admissionDate);
    } else {
      initialProvisionDate = new Date(`${endPeriod.getFullYear()}-01-01`);
    }

    if (admissionDate > initialProvisionDate) {
      initialProvisionDate = new Date(admissionDate);
    }
    //get the days that affect antiquity

    if (!interest) {
      const { totalQuantity: daysaffect } =
        await this.movementService.getMovementsAffectingAntiquity(
          month,
          year,
          employee_id,
        );
      // worked days unemploye
      return (
        differenceInDays(new_date_end_period, initialProvisionDate) - daysaffect
      );
    }

    return differenceInDays(new_date_end_period, initialProvisionDate);
  }

  private async calculateBaseConcepts(
    employee_id: string,
    period_year: number,
    period_month: number,
  ): Promise<number> {
    // get sum of all concepts base to calculate unemployed
    return this.movementService.getSumMovementsValues(
      employee_id,
      period_year,
      period_month,
      {
        ['severanceBase']: true,
      },
    );
  }

  private async getUnemploymentPreviousPeriod(
    employee_id: string,
    year: number,
    previousPeriodNumber: number,
    concept_new_balance: string,
  ): Promise<{ totalQuantity: number; totalValue: number }> {
    if (previousPeriodNumber > 0) {
      return { totalQuantity: 0, totalValue: 0 };
    }

    const movement =
      await this.movementService.getMovementByConceptAndPeriodNumber(
        employee_id,
        year,
        previousPeriodNumber,
        concept_new_balance,
      );
    if (movement === null) {
      return { totalQuantity: 0, totalValue: 0 };
    }
    const { quantity, value } = movement;
    return {
      totalQuantity: quantity,
      totalValue: value,
    };
  }
}
