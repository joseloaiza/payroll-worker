import {
  IPeriod,
  PayrollContext,
} from 'src/payroll/interfaces/payroll.interfaces';

export interface ResolvedInput {
  sourceTable: string;
  sourceColumn: string;
  inputLabel?: string;
  value: {
    value_numeric?: number;
    value_text?: string;
    value_date?: Date;
    value_boolean?: boolean;
    value_uuid?: string;
    value_json?: object;
  };
}

// Each resolver receives the full employee context
export type InputResolver = (ctx: SnapshotContext) => ResolvedInput | null;

export interface SnapshotContext {
  employeeId: string;
  companyId: string;
  //periodId: string;
  // Pre-loaded domain data — load once, reuse across all resolvers
  //employeeJob: EmployeeJob; // your employeeJob row
  //mployeePayment: EmployeePayment;
  period: IPeriod;
  payroll: PayrollContext;
  // add more as needed
}

// Registry: input_code → resolver function
export const INPUT_RESOLVERS: Record<string, InputResolver> = {
  'WORKING.CONTRACTREGIME_ID': (ctx) => ({
    sourceTable: 'employeeWorking',
    sourceColumn: 'contractRegime_id',
    inputLabel: 'Contract Regime',
    value: { value_uuid: ctx.payroll.employeeContext.contractRegime_id },
  }),
  'WORKING.EMPLOYEETYPE_ID': (ctx) => ({
    sourceTable: 'employeeWorking',
    sourceColumn: 'employeeType_id',
    inputLabel: 'Employee Type',
    value: { value_uuid: ctx.payroll.employeeContext.employeeType_id },
  }),
  'WORKING.WORKPLACERISKS_ID': (ctx) => ({
    sourceTable: 'employeeWorking',
    sourceColumn: 'workPlaceRisks_id',
    inputLabel: 'Work Place Risks',
    value: { value_uuid: ctx.payroll.employeeContext.workPlaceRisks_id },
  }),
  'WORKING.WORKINGHOUR_ID': (ctx) => ({
    sourceTable: 'employeeWorking',
    sourceColumn: 'workingHour_id',
    inputLabel: 'Working Hour',
    value: { value_uuid: ctx.payroll.employeeContext.workingHour_id },
  }),
  'SOCIALSECURITY.ENTITYHEALTH_ID': (ctx) => ({
    sourceTable: 'employeeSocialSecurity',
    sourceColumn: 'entityHealth_id',
    inputLabel: 'Entity Health',
    value: { value_uuid: ctx.payroll.employeeContext.entityHealth_id },
  }),
  'SOCIALSECURITY.ENTITYPENSION_ID': (ctx) => ({
    sourceTable: 'employeeSocialSecurity',
    sourceColumn: 'entityPension_id',
    inputLabel: 'Entity Pension',
    value: { value_uuid: ctx.payroll.employeeContext.entityPension_id },
  }),
  'SOCIALSECURITY.ENTITYSEVERANCE_ID': (ctx) => ({
    sourceTable: 'employeeSocialSecurity',
    sourceColumn: 'entitySeverance_id',
    inputLabel: 'Entity Severance',
    value: { value_uuid: ctx.payroll.employeeContext.entitySeverance_id },
  }),
  'SOCIALSECURITY.CONTRIBUTORTYPE_ID': (ctx) => ({
    sourceTable: 'employeeSocialSecurity',
    sourceColumn: 'contributorType_id',
    inputLabel: 'Contributor Type',
    value: { value_uuid: ctx.payroll.employeeContext.contributorType_id },
  }),
  'SOCIALSECURITY.CONTRIBUTORSUBTYPE_ID': (ctx) => ({
    sourceTable: 'employeeSocialSecurity',
    sourceColumn: 'contributorSubType_id',
    inputLabel: 'Contributor Subtype',
    value: { value_uuid: ctx.payroll.employeeContext.contributorSubType_id },
  }),
  'EMPLOYEEPAYMENT.BANK_ID': (ctx) => ({
    sourceTable: 'employeePayment',
    sourceColumn: 'bank_id',
    inputLabel: 'Bank',
    value: { value_uuid: ctx.payroll.employeeContext.bank_id },
  }),
  'EMPLOYEEPAYMENT.ACCOUNT_TYPE_ID': (ctx) => ({
    sourceTable: 'employeePayment',
    sourceColumn: 'accountType_id',
    inputLabel: 'Account Type',
    value: { value_uuid: ctx.payroll.employeeContext.accountType_id },
  }),
  'EMPLOYEEPAYMENT.ACCOUNTNUMBER': (ctx) => ({
    sourceTable: 'employeePayment',
    sourceColumn: 'accountNumber',
    inputLabel: 'Account Number',
    value: { value_text: ctx.payroll.employeeContext.accountNumber },
  }),
  'JOB.POSITION_ID': (ctx) => ({
    sourceTable: 'employeeJob',
    sourceColumn: 'position_id',
    inputLabel: 'Position',
    value: { value_uuid: ctx.payroll.employeeContext.position_id },
  }),
  'JOB.COSTCENTER_ID': (ctx) => ({
    sourceTable: 'employeeJob',
    sourceColumn: 'costCenter_id',
    inputLabel: 'Cost Center',
    value: { value_uuid: ctx.payroll.employeeContext.costCenter_id },
  }),
  'JOB.AREA_ID': (ctx) => ({
    sourceTable: 'employeeJob',
    sourceColumn: 'area_id',
    inputLabel: 'Area',
    value: { value_uuid: ctx.payroll.employeeContext.area_id },
  }),
  'JOB.SUBSIDIARY_ID': (ctx) => ({
    sourceTable: 'employeeJob',
    sourceColumn: 'subsidiary_id',
    inputLabel: 'Subsidiary',
    value: { value_uuid: ctx.payroll.employeeContext.subsidiary_id },
  }),
  'SALARY.SALARYTYPE_ID': (ctx) => ({
    sourceTable: 'employeePayment',
    sourceColumn: 'salaryType_id',
    inputLabel: 'Salary Type',
    value: { value_uuid: ctx.payroll.employeeContext.salaryType_id },
  }),
  'SALARY.SALARY': (ctx) => ({
    sourceTable: 'employeePayment',
    sourceColumn: 'salary',
    inputLabel: 'Salary',
    value: { value_numeric: ctx.payroll.employeeContext.salary },
  }),
  // Add as many as your catalog defines...
};
