import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EmployeeService } from './../employee/employee.service';
import { ConceptsService } from './concepts/concepts.service';
import { MovementsService } from './../movements/movements.service';
import { AbsenteeismService } from './../novelties/absenteeism/absenteeism.service';
import { RecurrentPaymentService } from './../novelties/recurrent-payment/recurrent-payment.service';
import { CodesConfigService } from './../config/codes-config/codes-config.service';
import { PayrollConstantsService } from './../config/payroll-constants/payroll-constants.service';
import { UnemploymentService } from './../provisions/unemployment/unemployment.service';
import { BonusPaymentService } from './../provisions/bonus-payment/bonus-payment.service';
import { SocialSecurityService } from './../social-security/social-security.service';
import { VacationsService } from './../provisions/vacations/vacations.service';
import { Period } from './entities/period.entity';
import { Movement } from './../movements/entities/movement.entity';
import {
  diseaseMappings,
  licenseMappings,
  PayrollContext,
} from './interfaces/payroll.interfaces';
import {
  PayrollCalculationError,
  PayrollValidationError,
} from './exeptions/payroll.exceptions';
import { PayrollCalculationContext } from './context/payroll-context';
import { Concept } from './entities/concept.entity';
import {
  buildMovementData,
  calculateWorkedDays,
  getRealEndDatePeriod,
} from './helpers/payrollHelpers';
import { getConceptCodes } from 'src/utils/concepts.utils';
import {
  CONCEPT_IDS_EXCESS1393,
  CONCEPT_IDS_REGIME,
  CONCEPT_IDS_SALARY,
  CONCEPT_IDS_TRANSPORT,
  CONSTANTS_IDS_TRANSPORT,
} from './../constants/constants';

@Injectable()
export class PayrollService {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly conceptService: ConceptsService,
    private readonly movementService: MovementsService,
    private readonly absenteeismService: AbsenteeismService,
    private readonly recurrentPaymentService: RecurrentPaymentService,
    private readonly socialSecurityService: SocialSecurityService,
    private readonly unemploymentService: UnemploymentService,
    private readonly bonusPaymentService: BonusPaymentService,
    private readonly codesConfigService: CodesConfigService,
    private readonly payrollConstantsService: PayrollConstantsService,
    private readonly vacationsService: VacationsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}
  async calculate(employeeId: string, companyId: string, rawPeriod: Period) {
    try {
      const period: Period = {
        ...rawPeriod,
        year: rawPeriod.year !== null ? Number(rawPeriod.year) : null,
        month: rawPeriod.month !== null ? Number(rawPeriod.month) : null,
        number: rawPeriod.number !== null ? Number(rawPeriod.number) : null,
        initialDate: rawPeriod.initialDate
          ? new Date(rawPeriod.initialDate)
          : null,
        endDate: rawPeriod.endDate ? new Date(rawPeriod.endDate) : null,
        previousPeriodYear: rawPeriod.previousPeriodYear,
        previousPeriodNumber: rawPeriod.previousPeriodNumber,
      };
      const context = await this.buildPayrollContext(
        employeeId,
        companyId,
        period,
      );

      //get concepts for company
      const conceptsCompany = await this.conceptService.getConcepts(companyId);
      const movementContext = new PayrollCalculationContext(
        employeeId,
        companyId,
        context.period,
      );

      //delete the calculate concetps
      await this.cleanExistingCalculations(context, conceptsCompany.concepts);
      await this.calculateCoreComponents(
        context,
        conceptsCompany.conceptMap,
        movementContext,
      );
      await this.calculateSocialSecurity(
        context,
        conceptsCompany.conceptMap,
        movementContext,
      );
      await this.calculateTransportAssitance(
        context,
        conceptsCompany.conceptMap,
        movementContext,
      );
      await this.calculateProvisions(
        context,
        conceptsCompany.conceptMap,
        movementContext,
      );
      await this.calculateVacationsProvisions(
        context,
        conceptsCompany.conceptMap,
        movementContext,
      );
    } catch (error) {
      this.logger.error(
        `Payroll calculation failed for employee ${employeeId}: ${error.message}`,
      );
      // ❌ Stop process and propagate error
      throw new Error(
        `Payroll calculation failed for employee ${employeeId}: ${error.message}`,
      );
    }
  }

  // In payroll.service.ts
  private async buildPayrollContext(
    employeeId: string,
    companyId: string,
    period: Period,
  ): Promise<PayrollContext> {
    const employee = await this.employeeService.getEmployee(employeeId);

    if (!employee) {
      this.logger.error(`Employee ${employeeId} not foud`);
      throw new PayrollValidationError('Employee not found');
    }

    const realEndDatePeriod = getRealEndDatePeriod(period.endDate);
    period.endDate = realEndDatePeriod;

    return {
      employeeId,
      companyId,
      period,
      realEndDatePeriod: realEndDatePeriod,
      totalWorkindays: 0,
      totalAbseenteDays: 0,
      rawSalary: 0,
      excess1393: 0,
      totalBaseCree: 0,
      ibcSocialSecurity: 0,
      vacationHistory: employee.vacationHistory,
      salaryData: {
        salary: employee.salary,
        salaryTypeCode: employee.salaryTypeCode,
        variableSalary: employee.variableSalary,
      },
      contractData: {
        regimeCode: employee.codeContractRegime,
        contributorTypeCode: employee.codeContributorType,
        riskPercentage: employee.percentageWorkPlaceRisks,
        transportAssistance: employee.transportAssistance,
        variableSalary: employee.variableSalary,
        initialContractDate: employee.initialContractDate,
        endContractDate: employee.endContractDate,
      },
    };
  }

  private async cleanExistingCalculations(
    context: PayrollContext,
    concepts: Concept[],
  ) {
    try {
      const { companyId, employeeId, period } = context;
      const conceptsToRemove = concepts
        .filter((c: any) => c.isCalculated === true)
        .map((e: any) => e.id);

      //remove all calculate concepts
      await this.movementService.removeMovementsByConcepts(
        employeeId,
        companyId,
        period.id,
        conceptsToRemove,
      );
    } catch (error) {
      this.logger.error(
        `Failed cleaning calculated concepts payroll ${context.employeeId}`,
        error.stack,
      );
      throw new PayrollCalculationError(
        `Could not clean concepts for employee`,
      );
    }
  }

  /////////////////////////////////grouping calculation /////////////////////////
  private async calculateCoreComponents(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
    calculateMovements: PayrollCalculationContext,
  ) {
    //calculate abseentes
    this.logger.log(`Calculating absentees for employee ${context.employeeId}`);
    calculateMovements.addMovements(
      await this.calculateAbsentees(context, conceptsMap),
    );
    this.logger.log(
      `Calculating Recurrents for employee ${context.employeeId}`,
    );
    calculateMovements.addMovements(await this.calculateRecurrents(context));

    this.logger.log(`Calculating Salary for employee ${context.employeeId}`);
    calculateMovements.addMovements(
      await this.calculateSalary(context, conceptsMap),
    );

    //save movements
    const mutableMovements = [...calculateMovements.movements];
    await this.movementService.saveMovements(mutableMovements);
    calculateMovements.clearMovements();
  }

  private async calculateSocialSecurity(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
    calculateMovements: PayrollCalculationContext,
  ) {
    calculateMovements.addMovements(
      await this.calculateExcess1393(context, conceptsMap),
    );

    const { movements, IBCSSP } =
      await this.socialSecurityService.calculateSocialSecurityIBC(
        context,
        conceptsMap,
      );
    context.ibcSocialSecurity = IBCSSP;
    calculateMovements.addMovements(movements);

    const socialSecutityCalcualtions = await Promise.all([
      this.socialSecurityService.calculateHealthContribution(
        context,
        conceptsMap,
      ),
      this.socialSecurityService.calculatePensionContribution(
        context,
        conceptsMap,
      ),
      this.socialSecurityService.calculateSolidarityContribution(
        context,
        conceptsMap,
      ),
      this.socialSecurityService.calculateParafiscalContribution(
        context,
        conceptsMap,
      ),
      this.socialSecurityService.calculateSocialSecurityContributionRisk(
        context,
        conceptsMap,
      ),
    ]);

    calculateMovements.addMovements(
      socialSecutityCalcualtions
        .flat()
        .filter((m): m is Movement => m !== null),
    );
    //save movements
    const mutableMovements = [...calculateMovements.movements];
    await this.movementService.saveMovements(mutableMovements);
    calculateMovements.clearMovements();
  }

  private async calculateTransportAssitance(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
    calculateMovements: PayrollCalculationContext,
  ) {
    this.logger.log(
      `Calculating transort asistance for employee ${context.employeeId}`,
    );
    const transportCalculations = await Promise.all([
      this.calculateTransportBase(context, conceptsMap),
      this.calculateTransportAssistance(context, conceptsMap),
    ]);
    calculateMovements.addMovements(
      transportCalculations.filter((m): m is Movement => m !== null),
    );

    //save movements
    const mutableMovements = [...calculateMovements.movements];
    await this.movementService.saveMovements(mutableMovements);
    calculateMovements.clearMovements();
  }

  private async calculateProvisions(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
    calculateMovements: PayrollCalculationContext,
  ) {
    this.logger.log(
      `Calculating provisions for employee ${context.employeeId}`,
    );
    const crCodes = await getConceptCodes(
      this.codesConfigService,
      CONCEPT_IDS_REGIME,
    );
    const { contractData } = context;
    const { regimeCode } = contractData;

    if (
      regimeCode === crCodes.aprenticeRegime ||
      regimeCode === crCodes.integralRegime
    ) {
      // Pensioned regime (excluded)
      return;
    }

    const unemploymentProvisions =
      await this.unemploymentService.calculateUnemploymentProvision(
        context,
        conceptsMap,
      );
    const interestUnemploymentProvisions =
      await this.unemploymentService.calculateInterestUnemploymentProvision(
        context,
        conceptsMap,
        0,
      );

    const bonusPaymentProvisions =
      await this.bonusPaymentService.calculateBonusPaymentProvision(
        context,
        conceptsMap,
      );
    calculateMovements.addMovements(unemploymentProvisions);
    calculateMovements.addMovements(interestUnemploymentProvisions);
    calculateMovements.addMovements(bonusPaymentProvisions);

    //save movements
    const mutableMovements = [...(calculateMovements.movements ?? [])]; // [...calculateMovements.movements];
    await this.movementService.saveMovements(mutableMovements);
    calculateMovements.clearMovements();
  }

  private async calculateVacationsProvisions(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
    calculateMovements: PayrollCalculationContext,
  ) {
    this.logger.log(
      `Calculating vacation provisions for employee ${context.employeeId}`,
    );
    const crCodes = await getConceptCodes(
      this.codesConfigService,
      CONCEPT_IDS_REGIME,
    );
    const { contractData } = context;
    const { regimeCode } = contractData;

    if (regimeCode === crCodes.aprenticeRegime) {
      // aprentice regime (excluded)
      return;
    }

    const vacationsProvisionsMovements =
      await this.vacationsService.calculateVacationProvision(
        context,
        conceptsMap,
      );

    await this.movementService.saveMovements(vacationsProvisionsMovements);
    calculateMovements.clearMovements();
  }

  /////////////////////////////////detail calculation /////////////////////////
  private async calculateAbsentees(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement[]> {
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
        error.stack,
      );
      throw new PayrollCalculationError(
        'Could not calculate absentees novelties',
      );
    }

    const allCodes = [
      ...diseaseMappings.map((m) => m.code),
      ...licenseMappings.map((m) => m.code),
    ];

    const codeIdPairs = await Promise.all(
      allCodes.map(async (code) => {
        const codeId = await this.codesConfigService.getCodeById(code);
        return [code, conceptsMap.get(codeId)] as const;
      }),
    );

    const codeToConceptId = new Map(codeIdPairs);
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

    context.totalAbseenteDays = totalAbsenteeDays;
    return movements;
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
      throw new Error(`Failed to calculate recurrents: ${error.message}`);
    }
  }

  private async calculateSalary(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement[]> {
    const {
      employeeId,
      companyId,
      period,
      contractData,
      salaryData,
      totalAbseenteDays,
    } = context;
    const { salary, salaryTypeCode } = salaryData;
    const { initialContractDate, endContractDate } = contractData;
    const numDaysPeriod = new Date(period.endDate).getDate();

    if (!employeeId || !companyId || !period || !salaryData || !contractData) {
      this.logger.error('Missing required payroll context fields');
      throw new PayrollValidationError('Invalid payroll context');
    }
    try {
      const salaryCodes = await getConceptCodes(
        this.codesConfigService,
        CONCEPT_IDS_SALARY,
      );

      const workedDays = calculateWorkedDays(
        initialContractDate,
        endContractDate,
        period.initialDate,
        period.endDate,
        numDaysPeriod,
      );

      const daysSalary = workedDays - totalAbseenteDays;

      const valueSalary = Math.round(((salary / 30) * daysSalary * 100) / 100);

      const movementCodes = new Map([
        [salaryCodes.ordinarySalaryCon, salaryCodes.ordinarySalary],
        [salaryCodes.integralSalaryCon, salaryCodes.integralSalary],
        [salaryCodes.sustenanceHelpCon, salaryCodes.sustenanceHelp],
        [salaryCodes.pensionAllowanceCon, salaryCodes.pensionAllowance],
      ]);
      const movementCode = movementCodes.get(salaryTypeCode) || undefined;
      const movementData = [
        { days: workedDays, value: 0, code: salaryCodes.workedDaysPeriod },
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

      context.rawSalary = valueSalary;
      return successes;
    } catch (error) {
      this.logger.error(`Error calculating salary for employee: ${employeeId}`);
      throw new Error(`Failed to calculate salary: ${error.message}`);
    }
  }

  private async calculateExcess1393(
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
      // Fetch salary and non-salary movements in parallel
      const [totalNoSalary, totalSalary] = await Promise.all([
        this.movementService.getSumMovementsValues(
          employeeId,
          period.year,
          period.month,
          {
            ['salaryBase']: false,
          },
        ),
        this.movementService.getSumMovementsValues(
          employeeId,
          period.year,
          period.month,
          {
            ['salaryBase']: true,
          },
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
      throw new Error(`Failed to calculate excess 1393: ${error.message}`);
    }
  }

  private async calculateTransportBase(
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
        {
          ['transportBase']: true,
        },
        period.id,
      );
      const concepId = conceptsMap.get(
        await this.codesConfigService.getCodeById('0081'),
      );
      return await this.movementService.create({
        employee_id: employeeId,
        quantity: 0, //todo: dias del periodo?
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
      throw new Error(`Failed to calculate ransport base: ${error.message}`);
    }
  }

  private async calculateTransportAssistance(
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

      // 2. Get all constant values in one call
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
        quantity: MovementWorkedDays.quantity, //todo: dias del periodo?
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
        `Failed to calculate  transport assistance: ${error.message}`,
      );
    }
  }
}
