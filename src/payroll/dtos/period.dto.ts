import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsDate,
  IsNumber,
} from 'class-validator';

import { BaseDto } from './../../utils/dto/Base.dto';
import { PaginationDto } from './../..//utils/dto/Pagination.dto';

export class CreatePeriodDto {
  @IsNumber()
  year: number;

  @IsUUID()
  company_id: string;
}

export class UpdatePeriodDto {
  @IsUUID()
  id: string;

  @IsNumber()
  year: number;

  @IsNumber()
  number: number;

  @IsDate()
  initialDate: Date;

  @IsDate()
  endDate: Date;

  @IsUUID()
  company_id: string;

  @IsUUID()
  periodStatus_id: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsString()
  month: number;
}

export class ResponsePeriodDto extends BaseDto {
  @IsUUID()
  id: string;

  @IsNumber()
  year: number;

  @IsNumber()
  number: number;

  @IsDate()
  initialDate: Date;

  @IsDate()
  endDate: Date;

  @IsUUID()
  company_id: string;

  @IsUUID()
  periodStatus_id: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsString()
  month: string;
}

export class FilterPeriodDto extends PaginationDto {
  @IsOptional()
  @IsNumber()
  number?: number;

  @IsOptional()
  @IsDate()
  initialDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsUUID()
  company_id?: string;

  @IsOptional()
  @IsUUID()
  periodStatus_id?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  month?: string;
}
