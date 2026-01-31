import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Cron } from '@nestjs/schedule';
import { MessagingClient } from 'src/messaging/messaging.interface';
import { CompanyService } from 'src/company/company.service';
import {
  PayrollCalculationError,
  PayrollValidationError,
} from 'src/payroll/exeptions/payroll.exceptions';
import { Period } from 'src/payroll/entities/period.entity';
import { PeriodService } from 'src/payroll/period/period.service';
import { EmployeeService } from 'src/employee/employee.service';
import { PayrollJobRepository } from 'src/payroll/jobs/payroll-job.repository';
@Injectable()
export class PayrollSchedulerService {
  private readonly BATCH_SIZE = 500;
  private readonly MAX_PARALLEL_BATCHES = 5;
  private readonly EXECUTE_PAYROLL_CRON =
    process.env.EXECUTE_PAYROLL_CRON === 'true';
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject('MESSAGING_CLIENT')
    private readonly messaging: MessagingClient,
    private readonly companyservice: CompanyService,
    private readonly periodService: PeriodService,
    private readonly employeeService: EmployeeService,
    private readonly payrollJobRepository: PayrollJobRepository,
  ) {}

  /**
   * Main scheduler - runs at configured time
   * Default: Every day at 1 AM
   * Change the cron expression to your needs:
   * - '0 0 1 * * *' = 1 AM daily
   * - '0 0 0 * * *' = 12 AM (midnight) daily
   * - '0 0 2 * * *' = 2 AM daily
   * - '0 30 0 * * *' = 12:30 AM daily
   */
  @Cron(process.env.PAYROLL_SCHEDULE_CRON || '0 */2 * * * *', {
    name: 'payroll-processor',
    timeZone: process.env.TZ || 'UTC',
  })
  //@Cron('0 */2 * * * *') // Runs every 30 seconds
  async processScheduledPayrolls() {
    // Check if scheduler is enabled
    if (!this.EXECUTE_PAYROLL_CRON) {
      this.logger.debug(
        'Payroll scheduler is disabled (EXECUTE_PAYROLL_CRON=false)',
      );
      return;
    }
    this.logger.log('======================================');
    this.logger.log('Starting scheduled payroll processing.');
    this.logger.log('======================================');

    const startTime = Date.now();
    try {
      // 1. Find all active companies
      const companies = await this.companyservice.findActiveCompanies();
      this.logger.log(`Found ${companies.length} active companies`);
      if (companies.length === 0) {
        this.logger.warn('No active companies found for payroll processing');
        return;
      }

      const companySummary = await Promise.allSettled(
        companies.map((company) =>
          this.calculatePayrollCompany(company.id).then((result) => ({
            companyId: company.id,
            companyName: company.name,
            ...result,
          })),
        ),
      );

      // Log results summary
      const successful = companySummary.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const failed = companySummary.filter(
        (r) => r.status === 'rejected',
      ).length;

      this.logger.log(
        `Payroll processing completed: ${successful} succeeded, ${failed} failed in ${Date.now() - startTime}ms`,
      );

      companySummary.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.error(
            `Company ${companies[index].name} (${companies[index].id}) failed: ${result.reason.message}`,
          );
        }
      });
    } catch (error) {
      this.logger.error('Fatal error in payroll processing', error.stack);
      throw error;
    }
  }

  async calculatePayrollCompany(companyId: string, employeeId?: string) {
    this.validateCompanyId(companyId);
    this.logger.log(
      `Starting payroll calculation for company ${companyId}${employeeId ? ` & employee ${employeeId}` : ''}`,
    );
    try {
      //get the period to proccess
      const period = await this.getCurrentPayrollPeriod(companyId);

      this.logger.log(
        `Period Found: ${period.number}/${period.month}/${period.year}`,
      );

      const previousPeriod = await this.periodService.getLastPeriod(
        period.year,
        period.number,
      );

      // Get employees
      this.logger.log(
        `getting employees for company ${companyId}${employeeId ? ` & employee ${employeeId}` : ''}`,
      );
      const employeesId = employeeId
        ? [employeeId]
        : await this.employeeService.getEmployeeIdsByCompany(companyId);

      if (employeesId.length === 0) {
        this.logger.warn(
          `No employees found for payroll calculation in company ${companyId}`,
        );
        return { employeesProcessed: 0, jobId: null };
      }

      // Create job record
      const job = await this.payrollJobRepository.create({
        companyId,
        periodId: period.id,
        totalEmployees: employeesId.length,
        periodData: {
          id: period.id,
          number: period.number,
          year: period.year,
          month: period.month,
          initialDate: period.initialDate,
          endDate: period.endDate,
          isActive: period.isActive,
          previousPeriodYear: previousPeriod.year,
          previousPeriodNumber: previousPeriod.number,
        },
      });

      const payrollJobs = employeesId.map((empId) => ({
        jobId: job.id,
        employeeId: empId,
      }));

      await this.sendMessagesInOptimalBatches(payrollJobs);

      this.logger.log(
        `✅ Successfully sent ${payrollJobs.length} payroll jobs for company ${companyId}`,
      );

      return {
        jobId: job.id,
        employeesProcessed: employeesId.length,
      };
    } catch (error) {
      this.logger.error(
        `Error calculating payroll for company ${companyId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private validateCompanyId(companyId: string): void {
    if (!companyId || companyId.trim() === '') {
      throw new PayrollValidationError('Company ID is required');
    }
  }

  private async getCurrentPayrollPeriod(companyId: string): Promise<Period> {
    try {
      const period = await this.periodService.get_period_on_process(
        companyId,
        new Date().getFullYear(),
      );
      if (!period) {
        throw new PayrollCalculationError(
          `No active payroll period found for company ${companyId}`,
        );
      }
      return period;
    } catch (error) {
      this.logger.error('Failed to get current payroll period', error.stack);
      throw new PayrollCalculationError('Could not retrieve payroll period');
    }
  }

  private async sendMessagesInOptimalBatches(messages: any[]): Promise<void> {
    if (messages.length === 0) {
      this.logger.warn('No messages to send');
      return;
    }

    const batches = this.chunkArray(messages, this.BATCH_SIZE);
    this.logger.log(
      `Sending ${messages.length} messages in ${batches.length} batches`,
    );

    // // Azure Service Bus limits:
    // // - Max batch size: 256 KB per batch
    // // - Max messages per batch: 100-1000 (depends on tier)
    // const BATCH_SIZE = 500; // Adjust based on your message size
    // const MAX_PARALLEL_BATCHES = 5; // Don't overwhelm Service Bus

    // const batches = this.chunkArray(messages, BATCH_SIZE);

    // this.logger.log(
    //   `Sending ${messages.length} messages in ${batches.length} batches`,
    // );

    // Send batches in parallel (with limit)
    for (let i = 0; i < batches.length; i += this.MAX_PARALLEL_BATCHES) {
      const batchGroup = batches.slice(i, i + this.MAX_PARALLEL_BATCHES);

      const results = await Promise.allSettled(
        batchGroup.map(async (batch, index) => {
          const batchNum = i + index + 1;
          try {
            await this.messaging.emitBatch(
              'calculate_payroll',
              batch,
              process.env.SERVICEBUS_PAYROLL_JOBS_QUEUE,
            );
            this.logger.log(
              `✅ Sent batch ${batchNum}/${batches.length} (${batch.length} messages)`,
            );
          } catch (err) {
            this.logger.error(
              `❌ Failed to send batch ${batchNum}: ${err.message}`,
            );
            throw err; // Fail fast
          }
        }),
      );
      // Check if all batches in group succeeded
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        throw new PayrollCalculationError(
          `Failed to send ${failed.length} batch(es) to message queue`,
        );
      }
    }
  }

  // private chunkArray<T>(array: T[], size: number): T[][] {
  //   const chunks: T[][] = [];
  //   for (let i = 0; i < array.length; i += size) {
  //     chunks.push(array.slice(i, i + size));
  //   }
  //   return chunks;
  // }

  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, (i + 1) * size),
    );
  }
}
