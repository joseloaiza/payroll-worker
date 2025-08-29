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
  contractType_id: string;

  @ViewColumn()
  initialContractDate: Date;

  @ViewColumn()
  endContractDate: Date;
}
