import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollProcessor } from './payroll.processor';
import { EmployeeModule } from 'src/employee/employee.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Period } from './entities/period.entity';
import { PeriodStatus } from './entities/period-status.entity';
import { ConceptsService } from './concepts/concepts.service';
import { MovementsModule } from 'src/movements/movements.module';
import { UnemploymentService } from 'src/provisions/unemployment/unemployment.service';
import { BonusPaymentService } from 'src/provisions/bonus-payment/bonus-payment.service';
import { CodesConfigModule } from 'src/config/codes-config.module';
import { AbsenteeHistoryRepository } from 'src/novelties/absenteeism/absentee-history.repository';
import { NoveltiesModule } from 'src/novelties/novelties.module';
import { SocialSecurityModule } from 'src/social-security/social-security.module';
import { ConceptRepository } from './concepts/concepts.repository';
import { Concept } from './entities/concept.entity';
import { CompanyModule } from 'src/company/company.module';
import { AbsenteeHistory } from 'src/novelties/entities/absenteeHistory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Period, PeriodStatus, Concept, AbsenteeHistory]),
    EmployeeModule,
    MovementsModule,
    CodesConfigModule,
    NoveltiesModule,
    SocialSecurityModule,
    CompanyModule,
  ],
  controllers: [PayrollProcessor],
  providers: [
    PayrollService,
    ConceptsService,

    UnemploymentService,
    BonusPaymentService,
    AbsenteeHistoryRepository,
    ConceptRepository,
  ],
})
export class PayrollModule {}
