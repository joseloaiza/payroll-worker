import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Movement } from './../movements/entities/movement.entity';
import { MovementsService } from '././../movements/movements.service';
import { CodesConfigService } from './../config/codes-config/codes-config.service';
import { AbsenteeismService } from './../novelties/absenteeism/absenteeism.service';
import { PayrollConstantsService } from './../config/payroll-constants/payroll-constants.service';
import { SolidarityRepository } from './solidarity.repository';
import { getConceptCodes } from 'src/utils/concepts.utils';
import {
  CONCEPT_IDS_CONTRIBUTION_RISK,
  CONCEPT_IDS_HEALTH,
  CONCEPT_IDS_IBC,
  CONCEPT_IDS_PARAFISCAL_CONTRIBUTION,
  CONCEPT_IDS_PENSION,
  CONCEPT_IDS_SOLIDARITY,
  CONSTANTS_IDS_CONTRIBUTION_RISK,
  CONSTANTS_IDS_HEALTH,
  CONSTANTS_IDS_IBC,
  CONSTANTS_IDS_PARAFISCAL_CONTRIBUTION,
  CONSTANTS_IDS_PENSION,
} from 'src/constants/constants';
import { PayrollContext } from 'src/payroll/interfaces/payroll.interfaces';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class SocialSecurityService {
  constructor(
    private readonly movementService: MovementsService,
    private readonly codesConfigService: CodesConfigService,
    private readonly absenteeismService: AbsenteeismService,
    private readonly payrollConstantsService: PayrollConstantsService,
    private readonly solidarityRepository: SolidarityRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}
  /**
   * calculate ibc social security
   * TODO: check the calculation
   * @param employee_id
   * @param period_id
   * @param period_year
   * @param period_month
   * @param period_init_date
   * @param period_fin_date
   * @param company_id
   * @param salary
   * @param concept_cr
   * @param excess1393_value
   * @returns
   */
  async calculateSocialSecurityIBC(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<{ movements: Movement[]; IBCSSP: number }> {
    this.logger.log(`Calculating IBC for employee ${context.employeeId}`);
    const {
      employeeId,
      companyId,
      period,
      contractData,
      salaryData,
      excess1393,
    } = context;
    const { regimeCode } = contractData;
    const { salary } = salaryData;
    const ibcCodes = await getConceptCodes(
      this.codesConfigService,
      CONCEPT_IDS_IBC,
    );
    try {
      const [totalSocialSecurityBase, base_value_before_month] =
        await Promise.all([
          this.movementService.getSumMovementsValues(
            employeeId,
            period.year,
            period.month,
            {
              ['securityBase']: true,
            },
          ),

          this.movementService.getSumOfMonthlyMovementsByConcept(
            employeeId,
            period.year,
            period.month - 1,
            ibcCodes.healthBase,
          ),
        ]);

      // Calculate social security bases
      const conceptCodes = ['0030', '0031', '0032'];

      // Helper function to get social security base by concept
      const getSocialSecurityBase = async (code: string) =>
        this.getSocialSecurityBaseByConcept(
          employeeId,
          period.initialDate,
          period.endDate,
          salary,
          base_value_before_month,
          await this.codesConfigService.getCodeById(code),
        );

      // Execute all calls in parallel
      const [
        { daysAbsent: SSVB_days, baseSS: SSVB_value },
        { daysAbsent: SSPLB_days, baseSS: SSPLB_value },
        { daysAbsent: SSULB_days, baseSS: SSULB_value },
      ] = await Promise.all(conceptCodes.map(getSocialSecurityBase));

      const movementData = [
        {
          days: 0,
          value: base_value_before_month,
          code: ibcCodes.healthBasePrevMonth,
        },
        { days: SSVB_days, value: SSVB_value, code: ibcCodes.vacationsBase },
        { days: SSPLB_days, value: SSPLB_value, code: ibcCodes.paidLeave },
        { days: SSULB_days, value: SSULB_value, code: ibcCodes.noPaidLeave },
      ];

      // 2. Get all constant values in one call
      const values = await this.payrollConstantsService.getConstantsByIds(
        CONSTANTS_IDS_IBC,
        this.codesConfigService,
      );
      const { tssi, tmsa, smlv } = values;

      // Compute social security base value
      const socialSecurityBaseValue =
        regimeCode === ibcCodes.integralSalry
          ? totalSocialSecurityBase * (tssi / 100)
          : totalSocialSecurityBase;

      // Compute total IBCSSP
      let IBCSSP =
        socialSecurityBaseValue +
        SSVB_value +
        SSPLB_value +
        SSULB_value +
        excess1393;

      const numDaysPeriod = new Date(period.endDate).getDate();
      const SMLV_value = numDaysPeriod === 15 ? smlv / 2 : smlv;

      // Fetch stored base salary same month but before period

      const movement = await this.movementService.getMovementByConceptMonth(
        employeeId,
        period.year,
        period.month,
        ibcCodes.healthBase,
      );
      const BS = movement?.value ?? 0; // Use nullish coalescing for better handling

      const maxIBCSSP = tmsa * SMLV_value;
      const minIBCSSP = SMLV_value;

      // Adjust IBCSSP based on salary constraints
      if (IBCSSP > maxIBCSSP) {
        IBCSSP = maxIBCSSP - BS;
      } else if (IBCSSP < minIBCSSP) {
        IBCSSP = minIBCSSP - BS;
      } else {
        IBCSSP -= BS;
      }
      movementData.push({ days: 0, value: IBCSSP, code: ibcCodes.healthBase });
      const { successes } = await this.movementService.createMovements(
        movementData,
        employeeId,
        companyId,
        period,
        conceptsMap,
      );

      return { movements: successes, IBCSSP };
    } catch (error) {
      this.logger.error(
        `Error calculating excess icbf for employee: ${employeeId}`,
      );
      throw new Error(`Failed to calculate icbf: ${error.message}`);
    }
  }

  async getSocialSecurityBaseByConcept(
    employeeId: string,
    period_init_date: Date,
    period_fin_date: Date,
    totalSalary: number,
    baseValueBeforeMonth: number,
    concept: string,
  ): Promise<{ daysAbsent: number; baseSS: number }> {
    let baseSS: number = 0;
    // Fetch absentee days
    const daysAbsent = await this.absenteeismService.calculateTotalDaysAbsences(
      employeeId,
      period_init_date,
      period_fin_date,
      concept,
    );

    if (daysAbsent <= 0) return { daysAbsent, baseSS }; // No absentee days, no calculation needed

    // Calculate social security base
    baseSS =
      ((baseValueBeforeMonth > 0 ? baseValueBeforeMonth : totalSalary) / 30) *
      daysAbsent;
    return { daysAbsent, baseSS };
  }

  async calculateHealthContribution(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement[]> {
    try {
      const {
        employeeId,
        companyId,
        period,
        contractData,
        salaryData,
        ibcSocialSecurity,
        totalBaseCree,
      } = context;
      this.logger.log(
        `Calculating health contribution for employee ${context.employeeId}`,
      );
      const { regimeCode } = contractData;
      const { salary } = salaryData;
      let employerHealthContribution = 0; // Aporte salud empresa (ASEM)
      let employeeHealthContribution = 0; // Aporte salud empleado (ASEMP)
      //await this.getConcepts(company_id);
      // Fetch all necessary parameters in parallel to optimize performance

      const healthCodes = await getConceptCodes(
        this.codesConfigService,
        CONCEPT_IDS_HEALTH,
      );

      // 2. Get all constant values in one call
      const values = await this.payrollConstantsService.getConstantsByIds(
        CONSTANTS_IDS_HEALTH,
        this.codesConfigService,
      );
      const {
        employeeContributionRate,
        employerContributionRate,
        minWageThreshold,
      } = values;

      // Convert percentage values to decimal
      const employeeRate = employeeContributionRate / 100;
      const employerRate = employerContributionRate / 100;

      switch (regimeCode) {
        case healthCodes.apprenticeRegime: //apprentice regime
          employerHealthContribution = ibcSocialSecurity * employerRate;
          break;

        case healthCodes.retireRegime: //retiree Regime:
          const aptCode =
            salary <= minWageThreshold
              ? '0041'
              : salary <= minWageThreshold * 2
                ? '0042'
                : '0043';

          const retireeContributionRate =
            (await this.payrollConstantsService.getConstantValue(
              await this.codesConfigService.getCodeById(aptCode),
            )) / 100;
          employeeHealthContribution =
            ibcSocialSecurity * retireeContributionRate;
          break;

        case healthCodes.integralRegime: //integralRegime:
          employeeHealthContribution = ibcSocialSecurity * employeeRate;
          employerHealthContribution = ibcSocialSecurity * employerRate;
          break;

        default:
          employeeHealthContribution = ibcSocialSecurity * employeeRate;
          if (totalBaseCree > minWageThreshold * 10) {
            employerHealthContribution = ibcSocialSecurity * employerRate;
          }
          break;
      }
      const movementData = [
        {
          days: 0,
          value: employerHealthContribution,
          code: healthCodes.comHealthContri,
        },
        {
          days: 0,
          value: employeeHealthContribution,
          code: healthCodes.empHealthContri,
        },
      ];

      const { successes } = await this.movementService.createMovements(
        movementData,
        employeeId,
        companyId,
        period,
        conceptsMap,
      );
      return successes;
    } catch (error) {
      this.logger.error(
        `Error calculating excess health contribution for  employee: ${context.employeeId}`,
      );
      throw new Error(
        `Failed to calculate health contribution: ${error.message}`,
      );
    }
  }

  async calculatePensionContribution(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement[]> {
    this.logger.log(
      `Calculating pension contribution for employee ${context.employeeId}`,
    );
    let employerPensionContribution = 0;
    let employeePensionContribution = 0;

    const { employeeId, companyId, period, contractData, ibcSocialSecurity } =
      context;
    const { regimeCode } = contractData;

    try {
      const pensionCodes = await getConceptCodes(
        this.codesConfigService,
        CONCEPT_IDS_PENSION,
      );

      // 2. Get all constant values in one call
      const values = await this.payrollConstantsService.getConstantsByIds(
        CONSTANTS_IDS_PENSION,
        this.codesConfigService,
      );
      const { employeeContributionRate, employerContributionRate } = values;

      const employerPensionRate = employerContributionRate / 100;
      const employeePensionRate = employeeContributionRate / 100;

      const validContributionCodes = new Set([
        pensionCodes.integralSalaryRegime,
        pensionCodes.ley50,
        pensionCodes.previusRegime,
      ]);

      if (validContributionCodes.has(regimeCode)) {
        employerPensionContribution = ibcSocialSecurity * employerPensionRate;
        employeePensionContribution = ibcSocialSecurity * employeePensionRate;
      }

      const movementData = [
        {
          days: 0,
          value: employerPensionContribution,
          code: pensionCodes.compPensionContri,
        },
        {
          days: 0,
          value: employeePensionContribution,
          code: pensionCodes.empPensionContri,
        },
      ];
      const { successes } = await this.movementService.createMovements(
        movementData,
        employeeId,
        companyId,
        period,
        conceptsMap,
      );
      return successes;
    } catch (error) {
      this.logger.error(
        `Error calculating excess pension contribution for employee: ${context.employeeId}`,
      );
      throw new Error(
        `Failed to calculate pension contribution: ${error.message}`,
      );
    }
  }

  async calculateSolidarityContribution(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement[]> {
    const {
      employeeId,
      companyId,
      period,
      contractData,
      salaryData,
      ibcSocialSecurity,
    } = context;
    this.logger.log(
      `Calculating solidarity contribution for employee ${context.employeeId}`,
    );
    const { regimeCode } = contractData;
    const { salary } = salaryData;
    try {
      const solidarityCodes = await getConceptCodes(
        this.codesConfigService,
        CONCEPT_IDS_SOLIDARITY,
      );

      // Fetch salary range contribution details
      const range = await this.solidarityRepository.getPercentageBySalaryRange(
        salary,
        true,
      );
      const percentage = range?.percentage ?? 0;
      const perSolidarity = range?.perSolidarity ?? 0;
      const perSubsistence = range?.perSubsistence ?? 0;

      // Skip if the contribution code is '0062' (Apprentice) or '0064' (Retiree)
      const excludedCodes = new Set([
        solidarityCodes.APREN,
        solidarityCodes.PENSI,
      ]);
      if (excludedCodes.has(regimeCode)) return;

      // Calculate general solidarity contribution
      const solidarityContribution = ibcSocialSecurity * (percentage / 100);

      const solidarityFund = solidarityContribution * (perSolidarity / 100);
      const subsistenceFund = solidarityContribution * (perSubsistence / 100);
      const movementData = [
        {
          days: 0,
          value: solidarityContribution,
          code: solidarityCodes.solidarityApportEm,
        },
        { days: 0, value: solidarityFund, code: solidarityCodes.solidarity },
        { days: 0, value: subsistenceFund, code: solidarityCodes.subsistence },
      ];

      const { successes } = await this.movementService.createMovements(
        movementData,
        employeeId,
        companyId,
        period,
        conceptsMap,
      );
      return successes;
    } catch (error) {
      this.logger.error(
        `Error calculating excess solidarity contribution for employee: ${context.employeeId}`,
      );
      throw new Error(
        `Failed to calculate solidarity contribution: ${error.message}`,
      );
    }
  }

  async calculateParafiscalContribution(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement[]> {
    this.logger.log(
      `Calculating parafiscal contribution for employee ${context.employeeId}`,
    );
    let icbf: number = 0;
    let sena: number = 0;
    let caja: number = 0;

    const { employeeId, companyId, period, contractData } = context;
    const { regimeCode } = contractData;

    try {
      const pfcCodes = await getConceptCodes(
        this.codesConfigService,
        CONCEPT_IDS_PARAFISCAL_CONTRIBUTION,
      );

      // 2. Get all constant values in one call
      const values = await this.payrollConstantsService.getConstantsByIds(
        CONSTANTS_IDS_PARAFISCAL_CONTRIBUTION,
        this.codesConfigService,
      );
      const { icbfRate, senaRate, cajaRate, tssi, cree, smlv } = values;

      const [totalBaseParafiscal, movement] = await Promise.all([
        this.movementService.getSumMovementsValues(
          employeeId,
          period.year,
          period.month,
          {
            ['parafiscalBase']: true,
          },
        ),
        this.movementService.getMovementByConceptMonth(
          employeeId,
          period.year,
          period.month,
          pfcCodes.subsistencia,
        ),
      ]);
      const baseParafilscalPrevious = movement ? movement.value : 0;

      const isIntegralRegime = regimeCode === pfcCodes.intgr;
      const socialSecurityRate = isIntegralRegime ? tssi / 100 : 1;

      const baseParafiscal =
        totalBaseParafiscal * socialSecurityRate - baseParafilscalPrevious;

      if (baseParafiscal <= 0) return;

      if (baseParafiscal > 0) {
        caja = baseParafiscal * (cajaRate / 100);

        if (regimeCode !== pfcCodes.intgr) {
          const scRed =
            await this.movementService.getSumOfMonthlyMovementsByConcept(
              employeeId,
              period.year,
              period.month,
              pfcCodes.baseCree,
            );
          const creeThreshold = cree * smlv;

          if (scRed > creeThreshold) {
            icbf = baseParafiscal * (icbfRate / 100);
            sena = baseParafiscal * (senaRate / 100);
          }
        } else {
          icbf = baseParafiscal * (icbfRate / 100);
          sena = baseParafiscal * (senaRate / 100);
        }
      }

      const movementData = [
        { days: 0, value: sena, code: pfcCodes.aportesena },
        { days: 0, value: icbf, code: pfcCodes.aporteicbf },
        { days: 0, value: caja, code: pfcCodes.aporteCaja },
        { days: 0, value: baseParafiscal, code: pfcCodes.subsistencia },
      ];

      const { successes } = await this.movementService.createMovements(
        movementData,
        employeeId,
        companyId,
        period,
        conceptsMap,
      );
      return successes;
    } catch (error) {
      this.logger.error(
        `Error calculating excess parafiscal contribution for employee: ${context.employeeId}`,
      );
      throw new Error(
        `Failed to calculate parafiscal contribution: ${error.message}`,
      );
    }
  }

  async calculateSocialSecurityContributionRisk(
    context: PayrollContext,
    conceptsMap: Map<string, string>,
  ): Promise<Movement[]> {
    this.logger.log(
      `Calculating social security contribution risk for employee ${context.employeeId}`,
    );
    const { employeeId, companyId, period, contractData } = context;
    const { regimeCode, contributorTypeCode, riskPercentage } = contractData;
    try {
      const crCodes = await getConceptCodes(
        this.codesConfigService,
        CONCEPT_IDS_CONTRIBUTION_RISK,
      );
      if (regimeCode === crCodes.aprenticeRegime) {
        // Pensioned regime (excluded)
        return;
      }

      // 2. Get all constant values in one call
      const values = await this.payrollConstantsService.getConstantsByIds(
        CONSTANTS_IDS_CONTRIBUTION_RISK,
        this.codesConfigService,
      );
      const { tmri, smlv, tssi } = values;

      // Sum of risk base movements
      const [totalBaseRisks, RiskBaseMovement] = await Promise.all([
        this.movementService.getSumMovementsValues(
          employeeId,
          period.year,
          period.month,
          {
            ['riskBase']: true,
          },
        ),
        this.movementService.getMovementByConceptMonth(
          employeeId,
          period.year,
          period.month,
          crCodes.riskBase,
        ),
      ]);

      const maxRiskValue = tmri * smlv;

      const previousRiskBase = RiskBaseMovement ? RiskBaseMovement.value : 0;

      let socialSecurityRiskBase = 0;

      switch (regimeCode) {
        case crCodes.integralRegime: {
          const socialSecurityRate = tssi;
          socialSecurityRiskBase =
            totalBaseRisks * (socialSecurityRate / 100) - previousRiskBase;
          break;
        }

        case crCodes.aprenticeRegime:
          if (contributorTypeCode === crCodes.aprenticeType) {
            socialSecurityRiskBase = totalBaseRisks - previousRiskBase;
          }
          break;

        default:
          socialSecurityRiskBase = totalBaseRisks - previousRiskBase;
          break;
      }

      socialSecurityRiskBase = Math.min(socialSecurityRiskBase, maxRiskValue);

      if (socialSecurityRiskBase > 0) {
        const movementData = [
          { days: 0, value: socialSecurityRiskBase, code: crCodes.riskBase },
          {
            days: 0,
            value: socialSecurityRiskBase * (riskPercentage / 100),
            code: crCodes.riskAport,
          },
        ];

        const { successes } = await this.movementService.createMovements(
          movementData,
          employeeId,
          companyId,
          period,
          conceptsMap,
        );
        return successes;
      }
      return;
    } catch (error) {
      this.logger.error(
        `Error calculating ss risk contribution for employee: ${context.employeeId}`,
      );
      throw new Error(
        `Failed to calculate ss rs risk contribution: ${error.message}`,
      );
    }
  }
}
