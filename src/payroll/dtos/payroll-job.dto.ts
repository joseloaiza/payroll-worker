import { IsString, IsNumber } from 'class-validator';

export class CreatePayrollJobdDto {
  @IsString()
  companyId: string;
  @IsString()
  periodId: string;
  @IsNumber()
  totalEmployees: number;
  @IsNumber()
  processedCount: number;
  @IsString()
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
