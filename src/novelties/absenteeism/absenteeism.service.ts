import { Injectable } from '@nestjs/common';
import { isBefore } from 'date-fns';
import { CalculationResult } from '../interfaces/result-desease-absentee';
import { numberDays, isSameOrBefore } from './../../utils/date-utilities';
import {
  CodesConfigService,
  CodesConfigDto,
} from './../../config/codes-config/codes-config.service';
import { AbsenteeHistoryRepository } from './absentee-history.repository';
import { PayrollConstantsService } from './../../config/payroll-constants/payroll-constants.service';
import { isBetween } from 'src/utils/number_utilities';
import { CalculationResultLicense } from '../interfaces/result-license-absentee';
import { getConceptCodes } from 'src/utils/concepts.utils';
import {
  CONCEPT_IDS_SICK_CODES,
  CONSTANTS_IDS_SICK_CODES,
} from 'src/constants/constants';

@Injectable()
export class AbsenteeismService {
  private disease_absentee: string[];
  private codes: CodesConfigDto[];
  private constants: Record<string, number> = {};
  constructor(
    private readonly codesConfigService: CodesConfigService,
    private readonly payrollConstantsService: PayrollConstantsService,
    private readonly repo: AbsenteeHistoryRepository,
  ) {}

  private async loadCodes(category: string) {
    this.codes = await this.codesConfigService.filterCodes(
      (item) => item.category === category,
    );
  }

  calculateAbsenteeDays(
    iniDate: Date,
    endDate: Date,
    iniPeriod: Date,
    endPeriod: Date,
  ): { days: number; daysBefore: number } {
    let days = 0;
    let daysBefore: number = 0;

    if (isBefore(iniDate, iniPeriod)) {
      if (isSameOrBefore(endDate, endPeriod)) {
        days = numberDays(iniPeriod, endDate);
      } else {
        days = numberDays(iniPeriod, endPeriod);
      }
      daysBefore = numberDays(iniDate, iniPeriod) - 1;
    } else if (isSameOrBefore(endDate, endPeriod)) {
      days = numberDays(iniDate, endDate);
    } else {
      days = numberDays(iniDate, endPeriod);
    }

    return { days, daysBefore };
  }

  /**
   * process the diseases absentee to the period
   * @param employee_id
   * @param iniPeriodDate
   * @param endPeriodDate
   * @returns
   */
  async processSickLeaveAbsences(
    employee_id: string,
    iniPeriodDate: Date,
    endPeriodDate: Date,
  ): Promise<CalculationResult> {
    this.loadCodes('DISEASE_ABSENTEE');
    const sickCodes = await getConceptCodes(
      this.codesConfigService,
      CONCEPT_IDS_SICK_CODES,
    );
    const validCodes = this.codes.map((config) => config.code);

    const disease_absentees = await this.repo.getAbsenteesByCodesAndDateRangeV2(
      employee_id,
      iniPeriodDate,
      endPeriodDate,
      null,
      validCodes,
    );

    return await disease_absentees.reduce<Promise<CalculationResult>>(
      async (prevPromise, absentee) => {
        const acc = await prevPromise;
        let DI_EMP = 0;
        let DI_EPS = 0;

        const code = absentee.absenteeType.code;

        const { days: daysAbsentee, daysBefore } = this.calculateAbsenteeDays(
          absentee.initialAbsencesDate,
          absentee.endAbsencesDate,
          iniPeriodDate,
          endPeriodDate,
        );

        // 2. Get all constant values in one call
        const values = await this.payrollConstantsService.getConstantsByIds(
          CONSTANTS_IDS_SICK_CODES,
          this.codesConfigService,
        );
        const { smlv, dige, pem2, pep3, pep5, pep8, pep9, auxe } = values;

        if (
          sickCodes.generalDisability === code ||
          sickCodes.extHospitalGeneralDisability === code
        ) {
          if (daysBefore < dige) {
            DI_EMP = daysAbsentee > dige ? dige : daysAbsentee;
            DI_EPS = daysAbsentee > dige ? daysAbsentee - dige : 0; // Assuming DI_EPS should be 0 if daysAbsentee >= DIGE
          } else {
            DI_EPS = daysAbsentee;
          }

          //calculate the value of days for company
          const VDI_EMP = this.calculateValueOfDays(
            absentee.baseAbsences,
            DI_EMP,
            pem2,
            smlv,
          );

          //calculate the value of days for EPS
          const VDI_EPS = this.calculateValueOfDays(
            absentee.baseAbsences,
            DI_EPS,
            pep3,
            smlv,
          );

          acc.DI_EMP_TOTAL += DI_EMP;
          acc.VDI_EMP_TOTAL += VDI_EMP;

          if (code === sickCodes.generalDisability) {
            acc.DI_EPS_TOTAL += DI_EPS;
            acc.VDI_EPS_TOTAL += VDI_EPS;
          } else {
            acc.DI_EPS_HOS_TOTAL += DI_EPS;
            acc.VDI_EPS_HOS_TOTAL += VDI_EPS;
          }
        } else if (
          sickCodes.extGeneralDisability === code ||
          sickCodes.extHospitalGeneralDisability === code
        ) {
          const { DI_EMP_EXT, VDI_EMP_EXT, DI_EPS_EXT, VDI_EPS_EXT } =
            await this.calculateExtendeOfDisability(
              absentee.referenceInhability,
              absentee.initialAbsencesDate,
              daysAbsentee,
              absentee.baseAbsences,
              daysBefore,
              dige,
              pem2,
              pep3,
              pep5,
              pep8,
              pep9,
              smlv,
            );
          acc.DI_EMP_TOTAL += DI_EMP_EXT;
          acc.VDI_EMP_TOTAL += VDI_EMP_EXT;

          if (code === sickCodes.extHospitalGeneralDisability) {
            acc.DI_EPS_EXT_TOTAL += DI_EPS_EXT;
            acc.VDI_EPS_EXT_TOTAL += VDI_EPS_EXT;
          } else {
            acc.DI_EPS_HOS_EXT_TOTAL += DI_EPS_EXT;
            acc.VDI_EPS_HOS_EXT_TOTAL += VDI_EPS_EXT;
          }
        } else {
          const baseFactor = absentee.baseAbsences / 30;
          // Default values
          let DI_EPS = daysAbsentee;
          let VDI_ACT_EMP = 0;
          let VDI_ACT_EPS = baseFactor * DI_EPS;
          if (
            code === sickCodes.jobAccident ||
            code === sickCodes.extJobAccident
          ) {
            DI_EMP = 1;
            DI_EPS = Math.max(daysAbsentee - 1, 0); // Ensures DI_EPS doesn't go negative
            VDI_ACT_EMP = baseFactor * DI_EMP;
            VDI_ACT_EPS = baseFactor * DI_EPS;
            acc.DI_EMP_ACT_TOTAL += DI_EMP;
            acc.VDI_EMP_ACT_TOTAL += VDI_ACT_EMP;
            if (code === sickCodes[4]) {
              acc.DI_EPS_ACT_TOTAL += DI_EPS;
              acc.VDI_EPS_ACT_TOTAL += VDI_ACT_EPS;
            } else {
              acc.DI_EPS_ENL_TOTAL += DI_EPS;
              acc.VDI_EPS_ENL_TOTAL += VDI_ACT_EPS;
            }
          } else {
            if (code === sickCodes.occupationalDisease) {
              acc.DI_EPS_ACT_EXT_TOTAL += DI_EPS;
              acc.VDI_EPS_ACT_EXT_TOTAL += VDI_ACT_EPS;
            } else {
              acc.DI_EPS_ENL_EXT_TOTAL += DI_EPS;
              acc.VDI_EPS_ENL_EXT_TOTAL += VDI_ACT_EPS;
            }
          }
        }

        const { DI_EMP_ADI_TOTAL, VDI_EMP_ADI_TOTAL } =
          await this.calculate_VDI_EMP_ADI_TOTAL(
            absentee.baseAbsences,
            acc.DI_EMP_TOTAL,
            acc.DI_EPS_TOTAL,
            absentee.absenteeType.code,
            smlv,
            auxe,
          );
        acc.DI_EMP_ADI_TOTAL = DI_EMP_ADI_TOTAL;
        acc.VDI_EMP_ADI_TOTAL = VDI_EMP_ADI_TOTAL;
        return acc;
      },
      Promise.resolve({
        DI_EMP_TOTAL: 0,
        VDI_EMP_TOTAL: 0,
        DI_EPS_TOTAL: 0,
        VDI_EPS_TOTAL: 0,
        DI_EPS_HOS_TOTAL: 0,
        VDI_EPS_HOS_TOTAL: 0,
        DI_EPS_EXT_TOTAL: 0,
        VDI_EPS_EXT_TOTAL: 0,
        DI_EMP_ADI_TOTAL: 0,
        VDI_EMP_ADI_TOTAL: 0,
        DI_EPS_HOS_EXT_TOTAL: 0,
        VDI_EPS_HOS_EXT_TOTAL: 0,
        DI_EMP_ACT_TOTAL: 0,
        VDI_EMP_ACT_TOTAL: 0,
        DI_EPS_ACT_EXT_TOTAL: 0,
        VDI_EPS_ACT_EXT_TOTAL: 0,
        DI_EPS_ACT_TOTAL: 0,
        VDI_EPS_ACT_TOTAL: 0,
        DI_EPS_ENL_TOTAL: 0,
        VDI_EPS_ENL_TOTAL: 0,
        DI_EPS_ENL_EXT_TOTAL: 0,
        VDI_EPS_ENL_EXT_TOTAL: 0,
      }),
    );
  }

  /**
   * process the diseases license to the period
   * @param employee_id
   * @param iniPeriodDate
   * @param endPeriodDate
   */
  async processLicenseAbsences(
    employee_id: string,
    iniPeriodDate: Date,
    endPeriodDate: Date,
  ): Promise<CalculationResultLicense> {
    this.loadCodes('LICENSE_ABSENTEE');

    const validCodes = this.codes.map((config) => config.code);

    const license_absentees = await this.repo.getAbsenteesByCodesAndDateRangeV2(
      employee_id,
      iniPeriodDate,
      endPeriodDate,
      null,
      validCodes,
    );
    return await license_absentees.reduce<Promise<CalculationResultLicense>>(
      async (prevPromise, absentee) => {
        const acc = await prevPromise;

        const { days: daysAbsentee } = this.calculateAbsenteeDays(
          absentee.initialAbsencesDate,
          absentee.endAbsencesDate,
          iniPeriodDate,
          endPeriodDate,
        );

        const value_license = (absentee.baseAbsences / 30) * daysAbsentee;
        const codeMapping = new Map<string, (acc: any) => void>([
          ['0122', (acc) => (acc.daysLicenseUnpaid += daysAbsentee)],
          [
            '0123',
            (acc) => {
              acc.daysLicensePaid += daysAbsentee;
              acc.valueDaysLicensePaid = value_license;
            },
          ],
          ['0126', (acc) => (acc.daysSuspension += daysAbsentee)],
          [
            '0127',
            (acc) => {
              acc.daysPaternity += daysAbsentee;
              acc.valueDaysPaternity = value_license;
            },
          ],
          [
            '0128',
            (acc) => {
              acc.daysMaternity += daysAbsentee;
              acc.valueDaysMaternity = value_license;
            },
          ],
        ]);
        const absenteeCode = absentee.absenteeType.code;
        const map_config =
          await this.codesConfigService.getConfigByCode(absenteeCode);
        const action = codeMapping.get(map_config.id);

        if (action) {
          action(acc);
        }

        return acc;
      },
      Promise.resolve({
        daysLicenseUnpaid: 0,
        daysLicensePaid: 0,
        valueDaysLicensePaid: 0,
        daysSuspension: 0,
        daysMaternity: 0,
        daysPaternity: 0,
        valueDaysMaternity: 0,
        valueDaysPaternity: 0,
      }),
    );
  }

  /**
   *  calculate total days absences
   * @param employee_id
   * @param init_period
   * @param end_period
   * @param code
   * @returns
   */
  async calculateTotalDaysAbsences(
    employee_id: string,
    init_period: Date,
    end_period: Date,
    code?: string,
  ): Promise<number> {
    const absenteeHistory = code
      ? await this.repo.getAbsenteesByCodesAndDateRangeV2(
          employee_id,
          init_period,
          end_period,
        )
      : await this.repo.getAbsenteesByCodesAndDateRangeV2(
          employee_id,
          init_period,
          end_period,
          code,
        );

    if (!absenteeHistory || absenteeHistory.length === 0) return 0;

    return absenteeHistory.reduce((totalDays, absentee) => {
      if (code) {
        const { days } = this.calculateAbsenteeDays(
          absentee.initialAbsencesDate,
          absentee.endAbsencesDate,
          init_period,
          end_period,
        );
        return totalDays + days;
      } else {
        return (
          totalDays +
          numberDays(absentee.initialAbsencesDate, absentee.endAbsencesDate)
        );
      }
    }, 0);
  }

  /**
   *calculate the days and value for company and social security (EPS)
   * @param absentee_ref
   * @param initialAbsenteeDate
   * @param daysAbsentee
   * @param base_absentee
   * @param daysBefore
   * @returns
   */
  async calculateExtendeOfDisability(
    absentee_ref: string,
    initialAbsenteeDate: Date,
    daysAbsentee: number,
    base_absentee: number,
    daysBefore: number,
    dige_value: number,
    pem2_value: number,
    pep3_value: number,
    pep5_value: number,
    pep8_value: number,
    pep9_value: number,
    smlv_value: number,
  ) {
    let DI_EMP_EXT = 0;
    let DI_EPS_EXT = 0;

    const days =
      (await this.repo.getInitialAbsenteeDays(absentee_ref)) +
      (await this.repo.getAbsenteeDaysByReference(
        absentee_ref,
        initialAbsenteeDate,
      ));

    if (days >= dige_value) {
      DI_EPS_EXT = daysAbsentee;
    } else {
      DI_EMP_EXT = Math.min(daysAbsentee, dige_value);
    }

    const VDI_EMP_EXT = this.calculateValueOfDays(
      base_absentee,
      DI_EMP_EXT,
      pem2_value,
      smlv_value,
    );

    // Calculate VDI_EPS_EXT based on days ranges
    const VDI_EPS_EXT = this.calculate_VDI_EPS_EXT(
      base_absentee,
      DI_EPS_EXT,
      days,
      daysBefore,
      pep3_value,
      pep5_value,
      pep8_value,
      pep9_value,
      smlv_value,
    );
    return {
      DI_EMP_EXT,
      VDI_EMP_EXT,
      DI_EPS_EXT,
      VDI_EPS_EXT,
    };
  }

  /**
   * Calculates the value of days based on the base salary, number of days, and percentage.
   * @param base - The base salary (can be a string or number).
   * @param days - The number of days to calculate.
   * @param percentage - The percentage to apply.
   * @param slmv - minimum salary
   * @returns The calculated value of days.
   * @throws Error if input validation fails or calculation encounters an issue.
   */
  private calculateValueOfDays(
    base: string | number,
    days: number,
    percentage: number,
    SMLV: number,
  ): number {
    try {
      // Validate inputs
      if (typeof base !== 'number' && typeof base !== 'string') {
        throw new Error(
          'Base must be a number or a string representation of a number.',
        );
      }
      const percentageNumber =
        typeof percentage === 'string' ? parseFloat(percentage) : percentage;
      // Convert base to a number if it's a string
      const baseNumber = typeof base === 'string' ? parseFloat(base) : base;
      const daysNumber = typeof days === 'string' ? parseFloat(days) : days;

      // Calculate the value based on the formula
      const calculatedValue: number =
        (baseNumber / 30) * daysNumber * (percentageNumber / 100);
      const smlvValue: number = (SMLV / 30) * days;

      // Return the higher value between the calculated value and the SMLV value
      return Number(Math.max(calculatedValue, smlvValue));
    } catch (error) {
      // Log the error for debugging (optional)
      console.error(`Error in calculateValueDays: ${error.message}`);
      // Re-throw the error to be handled by the caller
      throw new Error(`Failed to calculate value of days: ${error.message}`);
    }
  }

  /**
   * calculate value for eps extension days
   * @param baseAbsences - absentee base
   * @param DI_EPS_EXT - eps extension days
   * @param totalDays - total days
   * @param daysBefore - before days
   * @returns
   */
  private calculate_VDI_EPS_EXT(
    baseAbsences: number,
    DI_EPS_EXT: number,
    totalDays: number,
    daysBefore: number,
    pep3_value: number,
    pep5_value: number,
    pep8_value: number,
    pep9_value: number,
    smlv_value: number,
  ) {
    const totalDaysWithExt = totalDays + daysBefore + DI_EPS_EXT;
    if (totalDaysWithExt <= 90) {
      return this.calculateValueOfDays(
        baseAbsences,
        DI_EPS_EXT,
        pep3_value,
        smlv_value,
      );
    } else if (isBetween(totalDaysWithExt, 91, 180)) {
      return this.calculateRange_VDI_EPS_EXT(
        totalDays,
        daysBefore,
        DI_EPS_EXT,
        90,
        baseAbsences,
        pep3_value,
        pep9_value,
        smlv_value,
      );
    } else if (isBetween(totalDaysWithExt, 181, 540)) {
      return this.calculateRange_VDI_EPS_EXT(
        totalDays,
        daysBefore,
        DI_EPS_EXT,
        180,
        baseAbsences,
        pep9_value,
        pep8_value,
        smlv_value,
      );
    } else if (totalDaysWithExt > 540) {
      return this.calculateRange_VDI_EPS_EXT(
        totalDays,
        daysBefore,
        DI_EPS_EXT,
        540,
        baseAbsences,
        pep8_value,
        pep5_value,
        smlv_value,
      );
    }
  }

  private calculateRange_VDI_EPS_EXT(
    totalDays: number,
    daysBefore: number,
    DI_EPS_EXT: number,
    minorValue: number,
    baseAbsences: number,
    percentage_minor: number,
    percentage_mayor: number,
    smlv_value: number,
  ) {
    const remainingDays = minorValue - (totalDays + daysBefore);
    const days_minor = Math.max(0, remainingDays);
    const days_mayor = days_minor > 0 ? DI_EPS_EXT - days_minor : DI_EPS_EXT;
    let VDI_EPS_EXT_minor = 0;
    let VDI_EPS_EXT_mayor = 0;
    if (days_minor > 0) {
      VDI_EPS_EXT_minor = this.calculateValueOfDays(
        baseAbsences,
        days_minor,
        percentage_minor,
        smlv_value,
      );
    }
    VDI_EPS_EXT_mayor = this.calculateValueOfDays(
      baseAbsences,
      days_mayor,
      percentage_mayor,
      smlv_value,
    );

    return VDI_EPS_EXT_minor + VDI_EPS_EXT_mayor;
  }

  /**
   *calculate the aditional days for company to pay aux
   * @param baseAbsences
   * @param DI_EMP_TOTAL
   * @param DI_EPS_TOTAL
   * @param assistanceType
   * @returns
   */
  private async calculate_VDI_EMP_ADI_TOTAL(
    baseAbsences: number,
    DI_EMP_TOTAL: number,
    DI_EPS_TOTAL: number,
    assistanceType: string,
    smlv_value: number,
    auxe_value: number,
  ) {
    let DI_EMP_ADI_TOTAL = 0;
    let VDI_EMP_ADI_TOTAL = 0;

    const codes = await this.codesConfigService.getManyCodesByIds([
      '0108',
      '0109',
      '0110',
    ]);

    // ✅ Map parameters to values
    const assistanceMap = new Map<string, number>([
      [codes[0], DI_EMP_TOTAL],
      [codes[1], DI_EPS_TOTAL],
      [codes[2], DI_EMP_TOTAL + DI_EPS_TOTAL],
    ]);

    // ✅ Get matching DI_EMP_ADI_TOTAL (Avoids switch-case)
    DI_EMP_ADI_TOTAL = assistanceMap.get(assistanceType) ?? 0;

    // ✅ Compute VDI_EMP_ADI_TOTAL (Only if DI_EMP_ADI_TOTAL > 0)
    if (DI_EMP_ADI_TOTAL > 0) {
      VDI_EMP_ADI_TOTAL = this.calculateValueOfDays(
        baseAbsences,
        DI_EMP_ADI_TOTAL,
        auxe_value, //auxe
        smlv_value, //smlv
      );
    }

    return { DI_EMP_ADI_TOTAL, VDI_EMP_ADI_TOTAL };
  }
}
