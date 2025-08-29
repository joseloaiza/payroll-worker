import { Module } from '@nestjs/common';
import { CompanyPayrollService } from './company-payroll/company-payroll.service';
import { CompanyPayrollRepository } from './company-payroll/company-payroll.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyPayroll } from './entities/company-payroll.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyPayroll])],
  providers: [CompanyPayrollService, CompanyPayrollRepository],
  exports: [CompanyPayrollService, CompanyPayrollRepository],
})
export class CompanyModule {}
