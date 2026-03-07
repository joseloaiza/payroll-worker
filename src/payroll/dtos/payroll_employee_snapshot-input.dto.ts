import { IsBoolean, IsNumber, IsString, IsUUID } from 'class-validator';

export class CreatePayrollSnapshotInputDto {
  @IsUUID()
  snapshot_id: string;

  @IsString()
  source_table: string;

  @IsString()
  source_column: string;

  @IsString()
  input_code: string;

  @IsString()
  input_label?: string;

  @IsNumber()
  value_numeric?: number;
  @IsString()
  value_text?: string;
  @IsString()
  value_date?: string;
  @IsBoolean()
  value_boolean?: boolean;
  @IsUUID()
  value_uuid?: string;
  @IsString()
  value_json?: any;
}

export class UpdatePayrollSnapshotInputDto {
  @IsUUID()
  id: string;
  @IsUUID()
  snapshot_id: string;

  @IsString()
  source_table: string;

  @IsString()
  source_column: string;

  @IsString()
  input_code: string;

  @IsString()
  input_label?: string;

  @IsNumber()
  value_numeric?: number;
  @IsString()
  value_text?: string;
  @IsString()
  value_date?: string;
  @IsBoolean()
  value_boolean?: boolean;
  @IsUUID()
  value_uuid?: string;
  @IsString()
  value_json?: any;
}

export class ResponsePayrollSnapshotInputDto {
  @IsUUID()
  id: string;
  @IsUUID()
  snapshot_id: string;

  @IsString()
  source_table: string;

  @IsString()
  source_column: string;

  @IsString()
  input_code: string;

  @IsString()
  input_label?: string;

  @IsNumber()
  value_numeric?: number;
  @IsString()
  value_text?: string;
  @IsString()
  value_date?: string;
  @IsBoolean()
  value_boolean?: boolean;
  @IsUUID()
  value_uuid?: string;
  @IsString()
  value_json?: any;
}
