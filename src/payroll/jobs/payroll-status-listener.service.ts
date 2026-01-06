import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleInit,
} from '@nestjs/common';
import { MessagingClient } from 'src/messaging/messaging.interface';
import { PayrollJobRepository } from './payroll-job.repository';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
@Injectable()
export class PayrollStatusListener implements OnModuleInit {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject('MESSAGING_CLIENT') private readonly client: MessagingClient,
    private readonly jobRepo: PayrollJobRepository,
  ) {}

  async onModuleInit() {
    console.log(
      `queue for status ${process.env.SERVICEBUS_PAYROLL_STATUS_QUEUE}`,
    );
    await this.client.subscribe(
      process.env.SERVICEBUS_PAYROLL_STATUS_QUEUE,
      async (msg) => {
        const { pattern, data } = msg;
        if (pattern === 'payroll_status_updates') {
          const { jobId, status } = data;
          const job = await this.jobRepo.findOne(jobId);
          if (!job) return;

          if (status === 'completed') {
            job.processedCount += 1;
          } else if (status === 'failed') {
            job.status = 'failed';
          }

          if (
            job.processedCount >= job.totalEmployees &&
            job.status !== 'failed'
          ) {
            job.status = 'completed';
            this.logger.log(`✅ Payroll job ${job.id} completed.`);
          }

          await this.jobRepo.update(job);
        }
      },
    );
  }
}
