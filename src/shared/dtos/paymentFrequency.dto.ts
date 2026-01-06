import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { BaseDto } from '../../utils/dto/Base.dto';
import { PaginationDto } from '../../utils/dto/Pagination.dto';

export class PaymentFrequencyDto extends BaseDto {
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
export class CreatePaymentFrequencyDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsBoolean()
  isActive: boolean;
}

export class UpdatePaymentFrequencyDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ResponsePaymentFrequencyDto extends BaseDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class FilterPaymentFrequencyDto extends PaginationDto {
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
