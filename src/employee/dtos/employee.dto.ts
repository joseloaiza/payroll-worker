export class SalaryDto {
  salary: number;
  initialSalaryDate: Date;
  endSalaryDate: Date;
  salaryType: SalaryTypeDto;
}

export class ContractDto {
  contractType_id: string;
  initialContractDate: Date;
  endContractDate: Date;
}

export class SalaryTypeDto {
  code: string;
}

export class EmployeeDto {
  id: string;
  company_id: string;
  identification: string;
  firstName: string;
  surname: string;
  identificationType_id: string;
  contractRegime_id: string;
  employeeType_id: string;
  workPlaceRisks_id: string;
  workingHour_id: string;
  transportAssistance: boolean;
  variableSalary: boolean;
  codeContractRegime: string;
  codeWorkPlaceRisks: string;
  percentageWorkPlaceRisks: number;
  codeEmployeeType: string;
  codeContributorType: string;
  salaries: SalaryDto[];
  contracts: ContractDto[];
}
