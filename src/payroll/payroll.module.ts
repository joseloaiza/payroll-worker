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
import { VacationsService } from 'src/provisions/vacations/vacations.service';
import { PayrollSchedulerService } from './scheduler/payroll-scheduler/payroll-scheduler.service';
import { PeriodService } from './period/period.service';
import { CompanyService } from 'src/company/company.service';
import { Company } from 'src/company/entities/company.entity';
import { CompanyRepository } from 'src/company/company.repository';
import { PayrollJobRepository } from './jobs/payroll-job.repository';
import { PeriodStatusService } from './period-status/period-status.service';
import { PeriodRepository } from './period/period.repository';
import { PeriodStatusRepository } from './period-status/period-status.repository';
import { PayrollStatusListener } from './jobs/payroll-status-listener.service';
import { PayrollJob } from './entities/payroll-jobs.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Period,
      PeriodStatus,
      Concept,
      AbsenteeHistory,
      Company,
      PayrollJob,
    ]),
    EmployeeModule,
    MovementsModule,
    CodesConfigModule,
    NoveltiesModule,
    SocialSecurityModule,
    CompanyModule,
  ],
  controllers: [PayrollProcessor],
  providers: [
    CompanyService,
    PayrollService,
    ConceptsService,
    UnemploymentService,
    BonusPaymentService,
    VacationsService,
    PayrollSchedulerService,
    PeriodService,
    PeriodStatusService,
    PayrollStatusListener,
    PeriodRepository,
    PeriodStatusRepository,
    AbsenteeHistoryRepository,
    ConceptRepository,
    CompanyRepository,
    PayrollJobRepository,
  ],
})
export class PayrollModule {}
