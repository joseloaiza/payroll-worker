import { IsString, IsOptional, IsDate } from 'class-validator';

export class BaseDto {
  @IsOptional()
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @IsString()
  createUser?: string;

  @IsOptional()
  @IsDate()
  updatedAt?: Date;

  @IsOptional()
  @IsString()
  updateUser?: string;
}
