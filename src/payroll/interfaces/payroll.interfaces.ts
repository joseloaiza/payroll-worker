import { Movement } from '../../movements/entities/movement.entity';
import { Period } from './../entities/period.entity';

export interface PayrollCalculationResult {
  salary: number;
  movements: Movement[];
  deductions: number;
  contributions: number;
}

// src/payroll/interfaces/payroll-context.interface.ts
export interface PayrollContext {
  employeeId: string;
  companyId: string;
  period: Period;
  totalWorkindays: number;
  totalAbseenteDays: number;
  excess1393: number;
  totalBaseCree: number;
  ibcSocialSecurity: number;
  rawSalary: number;
  salaryData: {
    salary: number;
    salaryTypeCode: string;
    variableSalary: boolean;
  };
  contractData: {
    regimeCode: string;
    contributorTypeCode: string;
    riskPercentage: number;
    transportAssistance: boolean;
    variableSalary: boolean;
    initialContractDate: Date;
    endContractDate: Date;
  };
  // Add other relevant data as needed
}

export interface MappingConfig {
  daysKey: string;
  valueKey?: string;
  value?: number;
  code: string;
}

export interface MovementData {
  quantity: number;
  value: number;
  concept: string;
}

export const diseaseMappings = [
  { daysKey: 'DI_EMP_TOTAL', valueKey: 'VDI_EMP_TOTAL', code: '0095' },
  { daysKey: 'DI_EPS_TOTAL', valueKey: 'VDI_EPS_TOTAL', code: '0096' },
  {
    daysKey: 'DI_EPS_EXT_TOTAL',
    valueKey: 'VDI_EPS_EXT_TOTAL',
    code: '0098',
  },
  {
    daysKey: 'DI_EPS_HOS_TOTAL',
    valueKey: 'VDI_EPS_HOS_TOTAL',
    code: '0099',
  },
  {
    daysKey: 'DI_EPS_HOS_EXT_TOTAL',
    valueKey: 'VDI_EPS_HOS_EXT_TOTAL',
    code: '0111',
  },
  {
    daysKey: 'DI_EMP_ACT_TOTAL',
    valueKey: 'VDI_EMP_ACT_TOTAL',
    code: '0117',
  },
  {
    daysKey: 'DI_EPS_ACT_TOTAL',
    valueKey: 'VDI_EPS_ACT_TOTAL',
    code: '0118',
  },
  {
    daysKey: 'DI_EPS_ACT_EXT_TOTAL',
    valueKey: 'VDI_EPS_ACT_EXT_TOTAL',
    code: '0119',
  },
  {
    daysKey: 'DI_EPS_ENL_TOTAL',
    valueKey: 'VDI_EPS_ENL_TOTAL',
    code: '0120',
  },
  {
    daysKey: 'DI_EPS_ENL_EXT_TOTAL',
    valueKey: 'VDI_EPS_ENL_EXT_TOTAL',
    code: '0121',
  },
  {
    daysKey: 'DI_EMP_ADI_TOTAL',
    valueKey: 'VDI_EMP_ADI_TOTAL',
    code: '0097',
  },
];

export const licenseMappings = [
  {
    daysKey: 'daysLicensePaid',
    valueKey: 'valueDaysLicensePaid',
    code: '0124',
  },
  { daysKey: 'daysLicenseUnpaid', value: 0, code: '0125' },
  { daysKey: 'daysSuspension', value: 0, code: '0129' },
  {
    daysKey: 'daysPaternity',
    valueKey: 'valueDaysPaternity',
    code: '0130',
  },
  {
    daysKey: 'daysMaternity',
    valueKey: 'valueDaysMaternity',
    code: '0131',
  },
];

export const CODES_CONFIG = {
  workedDays: '0132',
  variablePart: '0133',
  staticPart: '0134',
  base: '0135',
  newValue: '0136',
  previousValue: '0137',
  provision: '0138',
  interestBase: '0139',
  interestNew: '0140',
  interestBefore: '0141',
  interestProvision: '0142',
  interestDays: '0143',
  interestFactor: '0144',
  unemployedPayed: '0157',
  unemployedInterestPayed: '0158',
};

export const CODES_CONFIG_BONUS_PAYMENT = {
  workedDays: '0145',
  variableBase: '0146',
  staticSalary: '0147',
  provisionBase: '0148',
  provisionValue: '0149',
  previusBunus: '0150',
  totalProvision: '0151',
  paidBonusConcept: '0156',
  bonusDaysConstant: '0155',
  bonusAlreryPay: '0156',
};
