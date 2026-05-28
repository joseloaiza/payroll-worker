import { DataSource, Repository } from 'typeorm';
import { Inject, Injectable, LoggerService } from '@nestjs/common';

import { PayrollJob } from '../entities/payroll-jobs.entity';
import { CreatePayrollJobdDto } from './../dtos/payroll-job.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class PayrollJobRepository {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(PayrollJob)
    protected readonly repo: Repository<PayrollJob>,
    private readonly dataSource: DataSource,
  ) {}

  async create(data: CreatePayrollJobdDto): Promise<PayrollJob> {
    const job = this.repo.create({
      ...data,
      processedCount: data.processedCount ?? 0,
      failedCount: data.failedCount ?? 0,
      status: data.status ?? 'processing',
    });
    return await this.repo.save(job);
  }

  async findOne(id: string): Promise<PayrollJob> {
    return await this.repo.findOne({
      where: { id: id },
      select: ['id', 'companyId', 'periodData', 'type', 'cause_liquidation_id'],
    });
  }

  async update(payrollJob: PayrollJob): Promise<string> {
    await this.repo.update(payrollJob.id, payrollJob);
    return 'User Updated Successfully';
  }

  async updateJobProgress(
    jobId: string,
    employeeId: string,
    status: 'completed' | 'failed',
    error?: string,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const jobRepo = manager.getRepository(PayrollJob);

        const job = await jobRepo
          .createQueryBuilder('job')
          .setLock('pessimistic_write')
          .where('job.id = :jobId', { jobId })
          .getOne();

        if (!job) {
          this.logger.error(`Job ${jobId} not found`);
          return;
        }

        // Initialize employeeResults
        if (!job.employeeResults) {
          job.employeeResults = {};
        }

        // Check duplicate
        if (job.employeeResults[employeeId]) {
          this.logger.warn(`Employee ${employeeId} already processed`);
          return;
        }

        // Record result
        job.employeeResults[employeeId] = {
          status,
          error,
          completedAt: new Date(),
        };

        // Update counts
        if (status === 'completed') {
          job.processedCount += 1;
        } else {
          job.failedCount = (job.failedCount || 0) + 1;
        }

        // Check completion
        const totalProcessed = job.processedCount + (job.failedCount || 0);
        if (totalProcessed >= job.totalEmployees) {
          job.status =
            job.failedCount > 0 ? 'completed_with_errors' : 'completed';
          job.completedAt = new Date();
        }

        await jobRepo.save(job);
      });
    } catch (err) {
      this.logger.error(`Failed to update job progress: ${err.message}`);
      throw err;
    }
  }
}
