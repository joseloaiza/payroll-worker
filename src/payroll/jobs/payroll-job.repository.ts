import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

import { PayrollJob } from '../entities/payroll-jobs.entity';
import { CreatePayrollJobdDto } from './../dtos/payroll-job.dto';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PayrollJobRepository {
  constructor(
    @InjectRepository(PayrollJob)
    protected readonly repo: Repository<PayrollJob>,
  ) {}

  async create(payrollJobDto: CreatePayrollJobdDto) {
    const payrollJob = new PayrollJob();
    payrollJob.companyId = payrollJobDto.companyId;
    payrollJob.periodId = payrollJobDto.periodId;
    payrollJob.totalEmployees = payrollJobDto.totalEmployees;
    payrollJob.processedCount = payrollJobDto.processedCount;
    payrollJob.status = payrollJobDto.status;
    payrollJob.createdAt = new Date();
    payrollJob.updatedAt = new Date();

    return await this.repo.save(payrollJob);
  }

  async findOne(id: string): Promise<PayrollJob> {
    return await this.repo.findOne({
      where: { id: id },
    });
  }

  async update(payrollJob: PayrollJob): Promise<string> {
    await this.repo.update(payrollJob.id, payrollJob);
    return 'User Updated Successfully';
  }
}
