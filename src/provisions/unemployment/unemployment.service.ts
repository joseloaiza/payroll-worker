import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { MovementsService } from './../../movements/movements.service';
import { CodesConfigService } from './../../config/codes-config/codes-config.service';
import { PayrollConstantsService } from './../../config/payroll-constants/payroll-constants.service';
import { getConceptCodes } from './../../utils/concepts.utils';
import {
  CONCEPT_IDS_UNEMPLOYMENT,
  CONCEPT_IDS_UNEMPLOYMENT_INTEREST,
} from './../../constants/constants';
import { Movement } from 'src/movements/entities/movement.entity';
import { PayrollContext } from 'src/payroll/interfaces/payroll.interfaces';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { differenceInDays360 } from 'src/utils/date-utilities';
import {
  UnemploymentCalculationData,
  InterestUnemploymentCalculationData,
} from 'src/liquidation/interfaces/liquidation.interfaces';

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
    const { employeeId, companyId, period } = context;
    try {
      const data = await this.calculateUnemploymentData(
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
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error calculating unemployment provision for employee: ${context.employeeId}`,
      );
      throw new Error(`No se pudo calcular las cesantias : ${message}`);
    }
  }

  async calculateInterestUnemploymentProvision(
    context: PayrollContext,
    conceptMap: Map<string, string>,
    calculaeUnpaidValue: number,
  ): Promise<Movement[]> {
    const { employeeId, companyId, period } = context;
    try {
      const data = await this.calculateInterestUnemploymentData(
        context,
        context.period.endDate,
        calculaeUnpaidValue,
      );
      return Promise.all(
        data.items.map((item) =>
          this.movementService.create({
            employee_id: employeeId,
            quantity: item.days,
            value: item.value,
            concept_id: conceptMap.get(item.code),
            period_id: period.id,
            year: period.year,
            month: period.month,
            company_id: companyId,
          }),
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error calculating unemployment rate provision for employee: ${context.employeeId}`,
      );
      throw new Error(
        `No se pudo calcular los intereses a la cesantias : ${message}`,
      );
    }
  }

  async calculateUnemploymentData(
    context: PayrollContext,
    cutoffDate: Date,
  ): Promise<UnemploymentCalculationData> {
    const { employeeId, period, contractData, salaryData } = context;
    const { initialContract, regimeCode } = contractData;
    const { salary } = salaryData;

    const cutoffYear = cutoffDate.getUTCFullYear();
    const cutoffMonth = cutoffDate.getUTCMonth() + 1;

    const unemploymentCodes = await getConceptCodes(
      this.codesConfigService,
      CONCEPT_IDS_UNEMPLOYMENT,
    );

    const [
      workedDays,
      baseVariableConcepts,
      alreadyPaidDays,
      previousBalance,
      payedDays,
    ] = await Promise.all([
      this.calculateWorkedDays(
        employeeId,
        cutoffMonth,
        cutoffYear,
        cutoffDate,
        initialContract.initialContractDate,
        regimeCode,
        false,
      ),
      this.calculateBaseConcepts(employeeId, cutoffYear, cutoffMonth),
      this.movementService.getSumMovementsValues(
        employeeId,
        cutoffYear,
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
        cutoffYear,
        period.number,
      ),
    ]);

    const baseProvision = baseVariableConcepts + salary;
    const totalUnemploymentDays = this.calculateUnpaidDays(
      workedDays,
      alreadyPaidDays,
    );
    const unpaidDays = totalUnemploymentDays - alreadyPaidDays;
    const unpaidValue = unpaidDays * (baseProvision / 30);

    const { totalQuantity: previousDays, totalValue: previousValue } =
      previousBalance;
    const { quantity: unemployedPayedDays, value: unemployedPayedValue } =
      payedDays;
    const { days: provisionDays, value: provisionValue } =
      this.calculateProvision(
        unpaidDays,
        previousDays,
        unemployedPayedDays,
        unpaidValue,
        previousValue,
        unemployedPayedValue,
      );

    return {
      items: [
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
      ],
      unpaidValue,
    };
  }

  async calculateInterestUnemploymentData(
    context: PayrollContext,
    cutoffDate: Date,
    unpaidValue: number,
  ): Promise<InterestUnemploymentCalculationData> {
    const { employeeId, period, contractData } = context;
    const { initialContract, regimeCode } = contractData;

    const cutoffYear = cutoffDate.getUTCFullYear();
    const cutoffMonth = cutoffDate.getUTCMonth() + 1;

    const interestUnemploymentCodes = await getConceptCodes(
      this.codesConfigService,
      CONCEPT_IDS_UNEMPLOYMENT_INTEREST,
    );

    const [
      workedDaysInterest,
      interestPaidDays,
      previusMonthInterest,
      InterestPayedDays,
    ] = await Promise.all([
      this.calculateWorkedDays(
        employeeId,
        cutoffMonth,
        cutoffYear,
        cutoffDate,
        initialContract.initialContractDate,
        regimeCode,
        true,
      ),
      this.movementService.getSumMovementsValues(
        employeeId,
        cutoffYear,
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
        cutoffYear,
        period.number,
      ),
    ]);

    const interestBaseValue = unpaidValue;
    const interestFactorDays =
      await this.payrollConstantsService.getConstantValue(
        interestUnemploymentCodes.interestFactor,
      );

    const totalInterestDays = (workedDaysInterest * interestFactorDays) / 360;
    const interestDays = totalInterestDays - interestPaidDays;
    const interestValue = interestDays * (interestBaseValue / 30);

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

    return {
      items: [
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
      ],
    };
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

    const initialProvisionDate = await this.resolveInitialProvisionDate(
      interest,
      endPeriod,
      admissionDate,
      regimeCode,
    );

    const baseDays = differenceInDays360(initialProvisionDate, endPeriod);

    if (interest) {
      return baseDays;
    }

    const { totalQuantity: daysAffected } =
      await this.movementService.getMovementsAffectingAntiquity(
        month,
        year,
        employee_id,
      );

    return baseDays - daysAffected;
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

  private async resolveInitialProvisionDate(
    interest: boolean,
    endPeriod: Date,
    admissionDate: Date,
    regimeCode: string,
  ): Promise<Date> {
    const startOfYear = new Date(`${endPeriod.getUTCFullYear()}-01-01`);

    let initialDate: Date;

    if (interest) {
      initialDate = startOfYear;
    } else {
      const specialRegimeCode =
        await this.codesConfigService.getCodeById('0060');
      const isSpecialRegime = specialRegimeCode === regimeCode;
      initialDate = isSpecialRegime ? startOfYear : new Date(admissionDate);
    }

    // Employee admitted after the calculated start — use admission date as the floor
    if (admissionDate > initialDate) {
      initialDate = admissionDate;
    }

    return initialDate;
  }
}
