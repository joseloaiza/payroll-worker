import { numberTransformer } from 'src/utils/number_utilities';
import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'employee_full_view' })
export class EmployeeFullView {
  @ViewColumn()
  employee_id: string;

  @ViewColumn()
  identification: string;

  @ViewColumn()
  company_id: string;

  @ViewColumn()
  firstName: string;

  @ViewColumn()
  surname: string;

  @ViewColumn()
  identificationType_id: string;

  @ViewColumn()
  contractRegime_id: string;

  @ViewColumn()
  employeeType_id: string;

  @ViewColumn()
  workPlaceRisks_id: string;

  @ViewColumn()
  workingHour_id: string;

  @ViewColumn()
  transportAssistance: boolean;

  @ViewColumn()
  variableSalary: boolean;

  @ViewColumn()
  codeContractRegime: string;

  @ViewColumn()
  codeWorkPlaceRisks: string;

  @ViewColumn({ transformer: numberTransformer })
  percentageWorkPlaceRisks: number;

  @ViewColumn()
  codeEmployeeType: string;

  @ViewColumn()
  codeContributorType: string;

  @ViewColumn({ transformer: numberTransformer })
  salary: number;

  @ViewColumn()
  initialSalaryDate: Date;

  @ViewColumn()
  endSalaryDate: Date;

  @ViewColumn()
  salaryTypeCode: string;

  @ViewColumn()
  vacationHistory: number;

  @ViewColumn()
  entityHealth_id: string;
  @ViewColumn()
  entityPension_id: string;
  @ViewColumn()
  contributorType_id: string;
  @ViewColumn()
  contributorSubType_id: string;
  @ViewColumn()
  entitySeverance_id: string;

  @ViewColumn()
  bank_id: string;
  @ViewColumn()
  accountType_id: string;
  @ViewColumn()
  accountNumber: string;

  @ViewColumn()
  costCenter_id: string;
  @ViewColumn()
  area_id: string;
  @ViewColumn()
  position_id: string;
  @ViewColumn()
  subsidiary_id: string;
  @ViewColumn()
  salaryType_id: string;
  @ViewColumn()
  companyEconomicActivityRisk_id: string;
}
