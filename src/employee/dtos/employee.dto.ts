import { BaseDto } from 'src/utils/dto/Base.dto';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsDate,
} from 'class-validator';

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

export class ResponseEmployeeDto extends BaseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  company_id: string;

  //
  // @IsUUID()
  // identificationType_id: string;

  @IsString()
  identification: string;

  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  secondName: string;

  @IsString()
  surname: string;

  @IsOptional()
  @IsString()
  secondSurName: string;

  @IsOptional()
  @IsDate()
  birthDate: Date;

  @IsOptional()
  @IsUUID()
  gender_id?: string;

  @IsOptional()
  @IsUUID()
  city_id?: string;

  @IsOptional()
  @IsUUID()
  state_id?: string;

  @IsOptional()
  @IsUUID()
  country_id?: string;

  @IsOptional()
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  cellPhone: string;

  @IsOptional()
  @IsString()
  img: string;

  @IsOptional()
  @IsString()
  email: string;

  @IsBoolean()
  isActive: boolean;

  company: { id: string; name: string };

  identificationType: { id: string; code: string; description: string };

  gender?: { id: string; name: string; description: string; isActive: boolean };

  city?: { id: string; name: string };

  state?: { id: string; name: string };

  country?: { id: string; name: string };

  job?: {
    id: string;
    costCenter_id: string;
    area_id: string;
    subsidiary_id: string;
    position_id: string;
    isActive: boolean;
    costCenter: {
      id: string;
      code: string;
      description: string;
      isActive: boolean;
    };
    area: {
      id: string;
      description: string;
      isActive: boolean;
    };
    position: {
      id: string;
      description: string;
      isActive: boolean;
    };
    subsidiary: {
      id: string;
      description: string;
      isActive: boolean;
    };
  };

  payment?: {
    accountNumber: string;
    bank_id: string;
    accountType_id: string;
    isActive: boolean;
    bank: {
      id: string;
      code: string;
      name: string;
      isActive: boolean;
    };
    accounType: {
      id: string;
      code: string;
      description: string;
      isActive: boolean;
    };
  };

  socialSecurity?: {
    contributorType_id: string;
    contributorSubType_id: string;
    entityHealth_id: string;
    entityPension_id: string;
    entitySeverance_id: string;
    isActive: boolean;
    contributorType: {
      id: string;
      code: string;
      description: string;
    };
    healthEntity: {
      id: string;
      code: string;
      name: string;
    };
    pensionEntity: {
      id: string;
      code: string;
      name: string;
    };
    severanceEntity: {
      id: string;
      code: string;
      name: string;
    };
  };

  working?: {
    employeeType_id: string;
    contractRegime_id: string;
    workPlaceRisks_id: string;
    workingHour_id: string;
    transportAssistance: boolean;
    variableSalary: boolean;
    isActive: boolean;
    contractRegime: {
      id: string;
      code: string;
      description: string;
      isActive: boolean;
    };
    employeeType: {
      id: string;
      code: string;
      description: string;
      isActive: boolean;
    };
    workPlaceRisks: {
      id: string;
      code: string;
      description: string;
      percentage: number;
      isActive: boolean;
    };
  };

  salaryType?: {
    id: string;
    code: string;
    description: string;
    isActive: boolean;
  };

  contractRegime?: {
    id: string;
    code: string;
    description: string;
    isActive: boolean;
  };

  contributorType?: {
    id: string;
    code: string;
    description: string;
  };

  workPlaceRisk?: {
    id: string;
    code: string;
    description: string;
    percentage: number;
    isActive: boolean;
  };

  employeeType?: {
    id: string;
    code: string;
    description: string;
    isActive: boolean;
  };

  contracts?: {
    employee_id: string;
    contractType_id: string;
    initialContractDate: Date;
    endContractDate: Date;
    isActive: boolean;
    contractType: {
      id: string;
      code: string;
      description: string;
      isActive: boolean;
    };
  }[];

  salaries?: {
    employee_id: string;
    salaryType_id: string;
    salary: number;
    initialSalaryDate: Date;
    endSalaryDate: Date;
    isActive: boolean;
    salaryType: {
      id: string;
      code: string;
      description: string;
      isActive: boolean;
    };
  }[];
}
