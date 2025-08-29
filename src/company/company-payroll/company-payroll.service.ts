import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyPayroll } from '../entities/company-payroll.entity';
import { CompanyPayrollRepository } from './company-payroll.repository';

@Injectable()
export class CompanyPayrollService {
  constructor(private readonly repo: CompanyPayrollRepository) {}

  async findOne(id: string): Promise<CompanyPayroll> {
    const entity = await this.repo.findOne(id);
    if (!entity) {
      throw new NotFoundException('CompanyPayroll not found');
    }
    return entity;
  }
}
