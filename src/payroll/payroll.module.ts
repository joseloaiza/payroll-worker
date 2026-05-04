import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollProcessor } from './payroll.processor';
import { EmployeeModule } from 'src/employee/employee.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Period } from './entities/period.entity';
import { PeriodStatus } from './entities/period-status.entity';
import { ConceptsService } from './concepts/concepts.service';
import { MovementsModule } from 'src/movements/movements.module';
import { CodesConfigModule } from 'src/config/codes-config.module';
import { AbsenteeHistoryRepository } from 'src/novelties/absenteeism/absentee-history.repository';
import { NoveltiesModule } from 'src/novelties/novelties.module';
import { SocialSecurityModule } from 'src/social-security/social-security.module';
import { ConceptRepository } from './concepts/concepts.repository';
import { Concept } from './entities/concept.entity';
import { CompanyModule } from 'src/company/company.module';
import { AbsenteeHistory } from 'src/novelties/entities/absenteeHistory.entity';
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
import { SnapshotService } from 'src/snapshot/snapshot.service';
import { PayrollEmployeeSnapshot } from 'src/snapshot/entitiy/payroll_employee_snapshot.entity';
import { PayrollEmployeeSnapshotInput } from 'src/snapshot/entitiy/payroll_employee_snapshot-input.entity';
import { PayrollInputCatalog } from 'src/snapshot/entitiy/payroll-input-catalog.entity';
import { ProvisionsModule } from 'src/provisions/provisions.module';

import { PayrollContextBuilderService } from './context-builder/payroll-context-builder.service';
import { CorePayrollCalculatorService } from './salary/core-payroll-calculator.service';
import { TransportCalculatorService } from './transport/transport-calculator.service';
import { Excess1393CalculatorService } from './excess1393/excess1393-calculator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Period,
      PeriodStatus,
      Concept,
      AbsenteeHistory,
      Company,
      PayrollJob,
      PayrollEmployeeSnapshot,
      PayrollEmployeeSnapshotInput,
      PayrollInputCatalog,
    ]),
    EmployeeModule,
    MovementsModule,
    CodesConfigModule,
    NoveltiesModule,
    SocialSecurityModule,
    CompanyModule,
    ProvisionsModule,
  ],
  controllers: [PayrollProcessor],
  providers: [
    CompanyService,
    PayrollService,
    ConceptsService,
    PayrollContextBuilderService,
    CorePayrollCalculatorService,
    TransportCalculatorService,
    Excess1393CalculatorService,
    PayrollSchedulerService,
    PeriodService,
    PeriodStatusService,
    SnapshotService,
    PayrollStatusListener,
    PeriodRepository,
    PeriodStatusRepository,
    AbsenteeHistoryRepository,
    ConceptRepository,
    CompanyRepository,
    PayrollJobRepository,
  ],
  exports: [SnapshotService],
})
export class PayrollModule {}
