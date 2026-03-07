import { IsUUID } from 'class-validator';

export class CreatePayrollSnapshotDto {
  @IsUUID()
  company_id: string;

  @IsUUID()
  employee_id: string;

  @IsUUID()
  period_id: string;
}

export class ResponsePayrollSnapshotDto {
  @IsUUID()
  id: string;

  @IsUUID()
  company_id: string;

  @IsUUID()
  employee_id: string;

  @IsUUID()
  period_id: string;
}

export class UpdatePayrollSnapshotDto {
  @IsUUID()
  id: string;

  @IsUUID()
  company_id: string;

  @IsUUID()
  employee_id: string;

  @IsUUID()
  period_id: string;
}
