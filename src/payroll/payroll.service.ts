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
import { LiquidationRepository } from 'src/liquidation/liquidation.repository';

interface CalculateOptions {
  type?: string;
  causeLiquidationId?: string;
}

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
    private readonly liquidationRepository: LiquidationRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async calculate(
    employeeId: string,
    companyId: string,
    rawPeriod: any,
    options?: CalculateOptions,
  ) {
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

      let liquidationId: string | undefined;
      if (options?.type === 'liquidation') {
        const header = this.liquidationRepository.create({
          employee_id: employeeId,
          company_id: companyId,
          period_id: period.id,
          termination_date: period.endDate,
          cause_liquidation_id: options.causeLiquidationId,
          type: 'liquidation',
        });
        const saved = await this.liquidationRepository.save(header);
        liquidationId = saved.id;
      }

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
        liquidationId,
      );
      context.rawSalary = rawSalary;
      await this.calculateSocialSecurity(
        context,
        conceptsCompany.conceptMap,
        movementContext,
        liquidationId,
      );
      await this.transportCalculator.calculate(
        context,
        conceptsCompany.conceptMap,
        movementContext,
        liquidationId,
      );
      await this.calculateProvisions(
        context,
        conceptsCompany.conceptMap,
        movementContext,
        liquidationId,
      );
      await this.calculateEnjoyedVacations(
        context,
        conceptsCompany.conceptMap,
        movementContext,
        liquidationId,
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
    liquidationId?: string,
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
    if (liquidationId)
      mutableMovements.forEach((m) => (m.liquidation_id = liquidationId));
    await this.movementService.saveMovements(mutableMovements);
    calculateMovements.clearMovements();
  }

  private async calculateProvisions(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
    calculateMovements: PayrollCalculationContext,
    liquidationId?: string,
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

    let mutableMovements = [...(calculateMovements.movements ?? [])];
    if (liquidationId) {
      // Apply liquidation concept mapping
      mutableMovements = this.applyLiquidationConcepts(
        mutableMovements,
        conceptsMap,
      );
      mutableMovements.forEach((m) => (m.liquidation_id = liquidationId));
    }

    await this.movementService.saveMovements(mutableMovements);
    calculateMovements.clearMovements();
  }

  private async calculateEnjoyedVacations(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
    calculateMovements: PayrollCalculationContext,
    liquidationId?: string,
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
    if (liquidationId)
      enjoyedMovements.forEach((m) => (m.liquidation_id = liquidationId));
    await this.movementService.saveMovements(enjoyedMovements);

    calculateMovements.clearMovements();
  }

  private applyLiquidationConcepts(
    movements: Movement[],
    conceptsMap: Map<string, string>,
  ): Movement[] {
    // Reverse conceptsMap to lookup code by concept_id
    const reverseConceptsMap = new Map<string, string>(
      [...conceptsMap.entries()].map(([code, id]) => [id, code]),
    );

    return movements.map((movement) => {
      const code = reverseConceptsMap.get(movement.concept_id);
      const liquidationCode = this.LIQUIDATION_CONCEPT_MAP[code];

      if (liquidationCode) {
        const newConceptId = conceptsMap.get(liquidationCode);
        if (newConceptId) {
          return { ...movement, concept_id: newConceptId };
        }
      }
      return movement;
    });
  }

  private readonly LIQUIDATION_CONCEPT_MAP: Record<string, string> = {
    '/136': 'M037', // Nuevo Saldo Cesantias → Cesantias Definitivas
    '/140': 'M038', // Nuevo Saldo Int Cesantias → Int Cesantias Definitivas
    '/129': 'M032', // Nuevo Saldo Prima Legal → Prima Legal de Servicio
    '/144': 'M036', // Nuevo Saldo Vacaciones → Vacaciones compensadas
  };
}
