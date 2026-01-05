import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { BaseDto } from './../../utils/dto/Base.dto';
import { PaginationDto } from './../..//utils/dto/Pagination.dto';

export class PeriodStatusDto extends BaseDto {
  @IsUUID()
  id: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsBoolean()
  isActive: boolean;
}

export class ResponsePeriodStatusDto {
  @IsUUID()
  id: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsBoolean()
  isActive: boolean;
}

export class FilterPeriodStatusDto extends PaginationDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
