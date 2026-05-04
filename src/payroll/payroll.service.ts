import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConceptsService } from './concepts/concepts.service';
import { MovementsService } from './../movements/movements.service';
import { SocialSecurityService } from './../social-security/social-security.service';
import { UnemploymentService } from './../provisions/unemployment/unemployment.service';
import { BonusPaymentService } from './../provisions/bonus-payment/bonus-payment.service';
import { VacationsService } from './../provisions/vacations/vacations.service';
import { SnapshotService } from 'src/snapshot/snapshot.service';

import { Movement } from './../movements/entities/movement.entity';
import { IPeriod, PayrollContext } from './interfaces/payroll.interfaces';
import { PayrollCalculationError } from './exeptions/payroll.exceptions';
import { PayrollCalculationContext } from './context/payroll-context';
import { Concept } from './entities/concept.entity';
import { getConceptCodes } from 'src/utils/concepts.utils';
import { CONCEPT_IDS_REGIME } from './../constants/constants';
import { convertDateToUTC } from 'src/utils/date-utilities';

import { PayrollContextBuilderService } from './context-builder/payroll-context-builder.service';
import { CorePayrollCalculatorService } from './salary/core-payroll-calculator.service';
import { TransportCalculatorService } from './transport/transport-calculator.service';
import { Excess1393CalculatorService } from './excess1393/excess1393-calculator.service';
import { CodesConfigService } from './../config/codes-config/codes-config.service';

@Injectable()
export class PayrollService {
  constructor(
    private readonly contextBuilder: PayrollContextBuilderService,
    private readonly conceptService: ConceptsService,
    private readonly movementService: MovementsService,
    private readonly coreCalculator: CorePayrollCalculatorService,
    private readonly socialSecurityService: SocialSecurityService,
    private readonly transportCalculator: TransportCalculatorService,
    private readonly excess1393Calculator: Excess1393CalculatorService,
    private readonly unemploymentService: UnemploymentService,
    private readonly bonusPaymentService: BonusPaymentService,
    private readonly vacationsService: VacationsService,
    private readonly snapshotService: SnapshotService,
    private readonly codesConfigService: CodesConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async calculate(employeeId: string, companyId: string, rawPeriod: any) {
    try {
      const initialDateObj = convertDateToUTC(rawPeriod.initialDate);
      const endDateObj = convertDateToUTC(rawPeriod.endDate);

      const period: IPeriod = {
        ...rawPeriod,
        year: initialDateObj.getUTCFullYear(),
        month: initialDateObj.getUTCMonth() + 1,
        number: rawPeriod.number !== null ? Number(rawPeriod.number) : null,
        initialDate: initialDateObj,
        endDate: endDateObj,
        previousPeriodYear: rawPeriod.previousPeriodYear,
        previousPeriodNumber: rawPeriod.previousPeriodNumber,
      };

      this.logger.log(`Period year: ${period.year}, month: ${period.month}`);
      const context = await this.contextBuilder.build(
        employeeId,
        companyId,
        period,
      );

      const conceptsCompany = await this.conceptService.getConcepts(companyId);
      const movementContext = new PayrollCalculationContext(
        employeeId,
        companyId,
        context.period,
      );

      await this.cleanExistingCalculations(context, conceptsCompany.concepts);

      await this.snapshotService.deleteSnapshotsForPeriod(
        companyId,
        employeeId,
        period.id,
      );

      await this.snapshotService.createSnapshot(
        companyId,
        employeeId,
        context,
        period,
        period.id,
      );

      const { rawSalary } = await this.coreCalculator.calculate(
        context,
        conceptsCompany.conceptMap,
        movementContext,
      );
      context.rawSalary = rawSalary;
      await this.calculateSocialSecurity(
        context,
        conceptsCompany.conceptMap,
        movementContext,
      );
      await this.transportCalculator.calculate(
        context,
        conceptsCompany.conceptMap,
        movementContext,
      );
      await this.calculateProvisions(
        context,
        conceptsCompany.conceptMap,
        movementContext,
      );
      await this.calculateEnjoyedVacations(
        context,
        conceptsCompany.conceptMap,
        movementContext,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Payroll calculation failed for employee ${employeeId}: ${errorMessage}`,
      );
      throw new Error(
        `Cálculo de nómina para el empleado ${employeeId} con errores: ${errorMessage}.`,
      );
    }
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

      await this.movementService.removeMovementsByConcepts(
        employeeId,
        companyId,
        period.id,
        conceptsToRemove,
      );
    } catch (error) {
      this.logger.error(
        `Failed cleaning calculated concepts payroll ${context.employeeId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new PayrollCalculationError(
        `No se pudieron limpiar los conceptos para el empleado`,
      );
    }
  }

  private async calculateSocialSecurity(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
    calculateMovements: PayrollCalculationContext,
  ) {
    const {
      movements: excess1393Movements,
      excess1393,
      totalBaseCree,
    } = await this.excess1393Calculator.calculate(context, conceptsMap);
    context.excess1393 = excess1393;
    context.totalBaseCree = totalBaseCree;
    calculateMovements.addMovements(excess1393Movements);

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

    const vacationsProvisionsMovements =
      await this.vacationsService.calculateVacationProvision(
        context,
        conceptsMap,
      );
    calculateMovements.addMovements(unemploymentProvisions);
    calculateMovements.addMovements(interestUnemploymentProvisions);
    calculateMovements.addMovements(bonusPaymentProvisions);
    calculateMovements.addMovements(vacationsProvisionsMovements);

    const mutableMovements = [...(calculateMovements.movements ?? [])];
    await this.movementService.saveMovements(mutableMovements);
    calculateMovements.clearMovements();
  }

  private async calculateEnjoyedVacations(
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
      return;
    }

    const enjoyedMovements =
      await this.vacationsService.calculateVacationsEnjoyed(
        context,
        conceptsMap,
      );
    await this.movementService.saveMovements(enjoyedMovements);

    calculateMovements.clearMovements();
  }
}
