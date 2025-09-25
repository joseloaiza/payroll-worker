import {
  Controller,
  Inject,
  LoggerService,
  OnModuleInit,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MessagingClient } from 'src/messaging/messaging.interface';
//import { JobStatusService } from '../../job-status/job-status.service';

@Controller()
export class PayrollProcessor implements OnModuleInit {
  constructor(
    private readonly payrollService: PayrollService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject('MESSAGING_CLIENT')
    private readonly client: MessagingClient,
  ) {}
  async onModuleInit() {
    await this.client.subscribe('payroll_queue', async (job) => {
      await this.handlePayrollCalculation(job);
    });
  }

  //@EventPattern('calculate_payroll')
  async handlePayrollCalculation(job: any) {
    //await this.jobStatusService.setStatus(job.jobId, 'processing');

    const start = Date.now(); // Start time in ms
    try {
      await this.payrollService.calculate(
        job.data.employeeId,
        job.data.companyId,
        job.data.period,
      );
      const end = Date.now(); // End time
      const duration = end - start; // Duration in ms

      this.logger.log(
        `calculation payroll for employee ${job.employeeId} finished in ${duration} mss`,
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
