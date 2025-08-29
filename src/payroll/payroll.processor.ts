import { Controller, Inject, LoggerService } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PayrollService } from './payroll.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
//import { JobStatusService } from '../../job-status/job-status.service';

@Controller()
export class PayrollProcessor {
  constructor(
    private readonly payrollService: PayrollService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  @EventPattern('calculate_payroll')
  async handlePayrollCalculation(@Payload() job) {
    //await this.jobStatusService.setStatus(job.jobId, 'processing');
    const start = Date.now(); // Start time in ms
    try {
      await this.payrollService.calculate(
        job.employeeId,
        job.companyId,
        job.period,
      );
      const end = Date.now(); // End time
      const duration = end - start; // Duration in ms

      this.logger.log(
        `calculation payroll for employee ${job.employeeId} finished in ${duration} ms`,
      );
      //await this.jobStatusService.setStatus(job.jobId, 'completed', result);
    } catch (err) {
      throw err;
      //   await this.jobStatusService.setStatus(job.jobId, 'failed', {
      //     error: err.message,
      //   });
    }
  }
}
