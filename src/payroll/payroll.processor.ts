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
    console.log(process.env.SERVICEBUS_PAYROLL_JOBS_QUEUE);
    await this.client.subscribe(
      process.env.SERVICEBUS_PAYROLL_JOBS_QUEUE!,
      async (job) => {
        const { pattern, data } = job;
        if (pattern === 'calculate_payroll') {
          await this.handlePayrollCalculation(data);
        }
        //await this.handlePayrollCalculation(job);
      },
    );
  }

  //@EventPattern('calculate_payroll')
  async handlePayrollCalculation(data: any) {
    //await this.jobStatusService.setStatus(job.jobId, 'processing');
    const { jobId, employeeId, companyId, period } = data;
    const start = Date.now(); // Start time in ms
    try {
      await this.payrollService.calculate(employeeId, companyId, period);
      const end = Date.now(); // End time
      const duration = end - start; // Duration in ms

      this.logger.log(
        `calculation payroll for employee ${employeeId} finished in ${duration} mss.`,
      );

      // Notify progress
      await this.client.emit(
        'payroll_status_updates',
        {
          jobId,
          employeeId: data.employeeId,
          status: 'completed',
        },
        process.env.SERVICEBUS_PAYROLL_STATUS_QUEUE,
      );

      //await this.jobStatusService.setStatus(job.jobId, 'completed', result);
    } catch (err) {
      await this.client.emit(
        'payroll_status_updates',
        {
          jobId,
          employeeId: data.employeeId,
          status: 'failed',
          error: err.message,
        },
        process.env.SERVICEBUS_PAYROLL_STATUS_QUEUE,
      );
      throw err;
    }
  }
}
