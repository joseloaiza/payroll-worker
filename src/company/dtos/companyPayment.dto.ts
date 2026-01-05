import { IsString, IsUUID, IsOptional } from 'class-validator';
import { BaseDto } from '../../utils/dto/Base.dto';
import { PaginationDto } from '../../utils/dto/Pagination.dto';

import { ResponsePaymentFrequencyDto } from '../../shared/dtos/paymentFrequency.dto';
import { Type } from 'class-transformer';

export class CreateCompanyPaymentDto {
  @IsUUID()
  paymentFrequency_id: string;

  @IsUUID()
  paymentMethod_id: string;

  @IsUUID()
  bank_id: string;

  @IsUUID()
  accountType_id: string;

  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsUUID()
  createdUser?: string;
}

export class UpdateCompanyPaymentDto {
  @IsOptional()
  @IsUUID()
  paymentFrequency_id: string;

  @IsOptional()
  @IsUUID()
  paymentMethod_id: string;

  @IsOptional()
  @IsUUID()
  bank_id: string;

  @IsOptional()
  @IsUUID()
  accountType_id: string;

  @IsOptional()
  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsUUID()
  updateUser?: string;
}

export class ResponseCompanyPaymentDto extends BaseDto {
  @IsUUID()
  id: string;

  paymentFrequency_id: string;

  paymentMethod_id: string;

  bank_id: string;

  accountType_id: string;

  accountNumber: string;
  @Type(() => ResponsePaymentFrequencyDto)
  paymentFrequency: ResponsePaymentFrequencyDto;
}

export class FilterCompanyPaymentDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  paymentFrequency_id?: string;

  @IsOptional()
  @IsUUID()
  paymentMethod_id?: string;

  @IsOptional()
  @IsUUID()
  bank_id?: string;

  @IsOptional()
  @IsUUID()
  accountType_id?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;
}
