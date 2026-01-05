import { Module } from '@nestjs/common';
import { CompanyPayrollService } from './company-payroll/company-payroll.service';
import { CompanyPayrollRepository } from './company-payroll/company-payroll.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyPayroll } from './entities/company-payroll.entity';
import { CompanyService } from './company.service';
import { CompanyPaymentService } from './company-payment/company-payment.service';
import { CompanyRepository } from './company.repository';
import { CompanyPaymentRepository } from './company-payment/comanyPayment.respository';
import { CompanyPayment } from './entities/companyPayment.entity';
import { Company } from './entities/company.entity';
import { PaymentFrequency } from './entities/paymentFrequency.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyPayroll,
      Company,
      CompanyPayment,
      PaymentFrequency,
    ]),
  ],
  providers: [
    CompanyPayrollService,
    CompanyPayrollRepository,
    CompanyService,
    CompanyPaymentService,
    CompanyRepository,
    CompanyPaymentRepository,
  ],
  exports: [
    CompanyPayrollService,
    CompanyPaymentService,
    CompanyPaymentRepository,
    CompanyPayrollRepository,
  ],
})
export class CompanyModule {}
