import {
  Controller,
  Inject,
  LoggerService,
  OnModuleInit,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MessagingClient } from 'src/messaging/messaging.interface';
import { PayrollJobRepository } from './../payroll/jobs/payroll-job.repository';
//import { JobStatusService } from '../../job-status/job-status.service';

@Controller()
export class PayrollProcessor implements OnModuleInit {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly payrollJobRepository: PayrollJobRepository,
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
      },
    );
  }

  async handlePayrollCalculation(data: any) {
    const { jobId, employeeId } = data;
    this.logger.log(`🚀 Processing employee ${employeeId}`);

    try {
      const job = await this.payrollJobRepository.findOne(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      await this.payrollService.calculate(
        employeeId,
        job.companyId,
        job.periodData,
        { type: job.type, causeLiquidationId: job.cause_liquidation_id },
      );
      // Update progress directly in database
      await this.payrollJobRepository.updateJobProgress(
        jobId,
        employeeId,
        'completed',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `❌ Payroll calculation failed for employee ${employeeId}: ${message}`,
      );

      await this.payrollJobRepository.updateJobProgress(
        jobId,
        employeeId,
        'failed',
        message,
      );
      throw err;
    }
  }
}
