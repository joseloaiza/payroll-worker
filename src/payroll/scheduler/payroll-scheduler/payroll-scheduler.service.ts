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
    this.logger.log('======================================');
    this.logger.log('Starting scheduled payroll processing. ');
    this.logger.log('======================================');

    try {
      // 1. Find all active companies
      this.logger.log('find active companies');
      const companies = await this.companyservice.findActiveCompanies();
      this.logger.log(`Found ${companies.length} active companies`);

      const companySummary = [];

      // 2. For each company, find active payroll periods
      for (const company of companies) {
        try {
          const result = await this.calculatePayrollCompany(company.id);
          companySummary.push({
            companyId: company.id,
            companyName: company.name,
            ...result,
          });
        } catch (error) {
          this.logger.error(
            `Error processing company ${company.name} (${company.id})`,
            error.stack,
          );
          companySummary.push({
            companyId: company.id,
            companyName: company.name,
            error: error.message,
          });
        }
      }
    } catch (error) {
      this.logger.error('Fatal error in payroll processing', error.stack);
    }
  }

  async calculatePayrollCompany(companyId: string, employeeId?: string) {
    if (employeeId)
      this.logger.log(
        `Starting payroll calculation for company ${companyId} & employee ${employeeId}`,
      );
    else
      this.logger.log(`Starting payroll calculation for company ${companyId}`);

    this.validateCompanyId(companyId);

    //get the period to proccess
    this.logger.log('find current period');
    const period = await this.periodService.get_period_on_process(
      companyId,
      new Date().getFullYear(),
    );
    this.logger.log(
      `Period Found ${period.number}  ${period.month} ${period.year}`,
    );
    // let period = await this.getCurrentPayrollPeriod(companyId);
    // if (!period) {
    //   period = this.logger.error(`Period for company ${companyId} not foud`);
    //   throw new PayrollValidationError('Period not found');
    // }

    const previousPeriod = await this.periodService.getLastPeriod(
      period.year,
      period.number,
    );

    let employeesId: string[] = [];
    if (!employeeId) {
      try {
        const employees =
          await this.employeeService.getEmployeesCompany(companyId);
        employeesId = employees.map((e) => e.employee_id);
      } catch (error) {
        this.logger.error(
          `Error getting employees for company ${companyId}: ${error.message}`,
        );
        throw new PayrollCalculationError(
          'Failed to calculate company payroll',
        );
      }
    } else {
      employeesId.push(employeeId);
    }

    this.logger.log(employeesId);

    const job = await this.payrollJobRepository.create({
      companyId,
      periodId: period.id,
      totalEmployees: employeesId.length,
      processedCount: 0,
      status: 'processing',
    });

    const periodData = {
      id: period.id,
      number: period.number,
      year: period.year,
      month: period.month,
      initialDate: period.initialDate,
      endDate: period.endDate,
      isActive: period.isActive,
      previousPeriodYear: previousPeriod.year,
      previousPeriodNumber: previousPeriod.number,
    };

    const allJobs = employeesId.map((empId) => ({
      jobId: job.id,
      employeeId: empId,
      companyId,
      period: periodData,
    }));

    // 2. Use emitBatch to send all jobs in optimized network requests
    if (allJobs.length > 0) {
      try {
        await this.messaging.emitBatch(
          'calculate_payroll',
          allJobs,
          process.env.SERVICEBUS_PAYROLL_JOBS_QUEUE,
        );
        this.logger.log(
          `Successfully  sent ${allJobs.length} payroll jobs via batching.`,
        );
      } catch (err) {
        this.logger.error(
          `Critical Error sending batch jobs for company ${companyId}: ${err.message}`,
        );
        throw new PayrollCalculationError(
          'Failed to send all payroll jobs to the message queue',
        );
      }
    } else {
      this.logger.log(
        `No employees found for payroll calculation in company ${companyId}.`,
      );
    }

    return job;
  }

  private validateCompanyId(companyId: string) {
    if (!companyId) {
      throw new PayrollValidationError('Company ID is required');
    }
  }

  private async getCurrentPayrollPeriod(companyId: string): Promise<Period> {
    try {
      return await this.periodService.find_period_by_status(
        'PR',
        new Date().getFullYear(),
        companyId,
      );
    } catch (error) {
      this.logger.error('Failed to get current payroll period', error.stack);
      throw new PayrollCalculationError('Could not retrieve payroll period');
    }
  }
}
