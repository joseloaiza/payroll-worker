import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { PayrollContext } from 'src/payroll/interfaces/payroll.interfaces';
import { getConceptCodes } from 'src/utils/concepts.utils';
import { CodesConfigService } from './../../config/codes-config/codes-config.service';
import { CompanyPayrollService } from './../../company/company-payroll/company-payroll.service';
import { MovementsService } from './../../movements/movements.service';
import { PayrollConstantsService } from './../../config/payroll-constants/payroll-constants.service';
import { CONCEPT_IDS_BONUS_PAYMENT } from 'src/constants/constants';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { differenceInDays360 } from 'src/utils/date-utilities';

@Injectable()
export class BonusPaymentService {
  constructor(
    private readonly codesConfigService: CodesConfigService,
    private readonly payrollConstantsService: PayrollConstantsService,
    private readonly movementsService: MovementsService,
    private readonly companyPayrollService: CompanyPayrollService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}
  async calculateBonusPaymentProvision(
    context: PayrollContext,
    conceptMap: Map<string, string>,
  ) {
    const { employeeId, companyId, period, contractData, salaryData } = context;
    const { initialContract } = contractData;
    const { salary } = salaryData;
    try {
      const bonusPaymentCodes = await getConceptCodes(
        this.codesConfigService,
        CONCEPT_IDS_BONUS_PAYMENT,
      );
      // Step 4: Get constant days for bonus payment
      const bonusDaysFactor =
        await this.payrollConstantsService.getConstantValue(
          bonusPaymentCodes.bonusDaysConstant,
        );

      const [
        workedDays,
        sumBaseConcepts,
        movBonusAlreadyPaid,
        previousMonthBalance,
        movbonusPayedDays,
      ] = await Promise.all([
        // Step 1: Calculate worked days (used in provision calculation) /133
        this.calculateWorkedDays(
          employeeId,
          companyId,
          period.month,
          period.year,
          period.endDate,
          initialContract.initialContractDate,
        ),
        // Step 2: Calculate base variable concepts (e.g., legal bonus base)
        this.movementsService.getSumMovementsValues(
          employeeId,
          period.year,
          period.month,
          {
            ['primaLegalBase']: true,
          },
        ),
        // Step 5: Get already paid bonus for this period
        this.movementsService.getMovementByConceptMonth(
          employeeId,
          period.year,
          period.month,
          bonusPaymentCodes.paidBonusConcept,
        ),
        this.movementsService.getMovementQuantityAndValue(
          bonusPaymentCodes.provisionValue,
          employeeId,
          period.previousPeriodYear,
          period.previousPeriodNumber,
        ),
        this.movementsService.getMovementQuantityAndValue(
          bonusPaymentCodes.bonusAlrearyPaid,
          employeeId,
          period.year,
          period.number,
        ),
      ]);
      // Step 3: Calculate the base provision (static + variable)
      const bonusProvisionBase = sumBaseConcepts + salary;
      const bonusAlreadyPaid = movBonusAlreadyPaid?.value ?? 0;
      // Step 6: Calculate new balance days and value
      const bonusProvisionDays =
        (workedDays * bonusDaysFactor) / 180 - bonusAlreadyPaid;
      const bonusProvisionValue =
        bonusProvisionDays * (bonusProvisionBase / 30);
      // Step 7: Calculate balance before month
      let previousBonusDays, previousBonusValue;
      if (period.number - 1 > 0) {
        previousBonusDays = previousMonthBalance.quantity;
        previousBonusValue = previousMonthBalance.value;
      }
      const { quantity: bonusPayedDays, value: bonusPayedValue } =
        movbonusPayedDays;
      const totalBonusProvisionDays =
        bonusProvisionDays + bonusPayedDays - previousBonusDays;
      const totalBonusPorvisionvalue =
        bonusProvisionValue + bonusPayedValue - previousBonusValue;
      //totalBonusProvisionDays * (bonusProvisionBase / 30);

      const movementData = [
        {
          days: workedDays,
          value: 0,
          code: bonusPaymentCodes.workedDays,
        },
        {
          days: 0,
          value: sumBaseConcepts,
          code: bonusPaymentCodes.variableBase,
        },
        {
          days: 0,
          value: salary,
          code: bonusPaymentCodes.staticSalary,
        },
        {
          days: 0,
          value: bonusProvisionBase,
          code: bonusPaymentCodes.provisionBase,
        },
        {
          days: bonusProvisionDays,
          value: bonusProvisionValue,
          code: bonusPaymentCodes.provisionValue,
        },
        {
          days: previousBonusDays,
          value: previousBonusValue,
          code: bonusPaymentCodes.previusBunus,
        },
        {
          days: totalBonusProvisionDays,
          value: totalBonusPorvisionvalue,
          code: bonusPaymentCodes.totalProvision,
        },
      ];

      return await Promise.all(
        movementData.map(async ({ days, value, code }) => {
          const conceptId = conceptMap.get(code);

          if (!conceptId) {
            this.logger.error(`Concept ID not found for code: ${code}`);
            throw new Error(
              `No se encontro el id del concepto con el codigo: ${code}`,
            );
          }

          return this.movementsService.create({
            employee_id: employeeId,
            quantity: days,
            value,
            concept_id: conceptId,
            period_id: period.id,
            year: period.year,
            month: period.month,
            company_id: companyId,
          });
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error calculating bonus payment provision for employee: ${context.employeeId}`,
      );
      throw new Error(
        `No se pudo calcular la provisión para la prima: ${message}`,
      );
    }
  }

  private async calculateWorkedDays(
    employee_id: string,
    company_id: string,
    month: number,
    year: number,
    endPeriod: Date,
    admissionDate: Date,
  ): Promise<number> {
    // Validate input dates
    if (!(endPeriod instanceof Date) || !(admissionDate instanceof Date)) {
      throw new Error('Invalid date parameters');
    }

    let initialProvisionDate =
      month < 7
        ? new Date(`${endPeriod.getUTCFullYear()}-01-01`) // Start of year for special regime
        : new Date(`${endPeriod.getUTCFullYear()}-07-01`);

    if (admissionDate > initialProvisionDate) {
      initialProvisionDate = admissionDate;
    }

    // Get the days that affect antiquity
    const { affectAbsenteeLB } =
      await this.companyPayrollService.findOne(company_id);

    const baseDays = differenceInDays360(initialProvisionDate, endPeriod);

    if (!affectAbsenteeLB) {
      return baseDays;
    }

    const { totalQuantity: daysAffected } =
      await this.movementsService.getMovementsAffectingAntiquity(
        month,
        year,
        employee_id,
      );

    // Worked days for employee
    return baseDays - daysAffected;
  }
}
